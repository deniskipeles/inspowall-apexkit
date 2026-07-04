import io
import os
import json
import time
import re
import torch
import requests
from PIL import Image

# pip install -U transformers accelerate bitsandbytes qwen-vl-utils

from transformers import Qwen2VLForConditionalGeneration, AutoProcessor, BitsAndBytesConfig
from qwen_vl_utils import process_vision_info

# ==========================================
# 1. APEXKIT CONFIGURATION
# ==========================================
APEXKIT_BASE_URL = "http://127.0.0.1:5000"  # Your ApexKit instance URL
APEXKIT_TOKEN = "YOUR_APEXKIT_ADMIN_TOKEN"              # Admin JWT Token
TENANT_ID = "vortex"
COLLECTION_NAME = "pins"

# Predefined valid categories for Vortex tenant
VALID_CATEGORIES = ['Architecture', 'Cyberpunk', 'Nature', 'Minimal', 'Abstract', 'Portrait', 'Fashion', 'Tech', 'Space']

# ==========================================
# 2. LOAD VISION MODEL (Qwen2-VL-7B-Instruct, 4-bit)
# ==========================================
print("🤖 Loading Qwen2-VL-7B-Instruct (4-bit) onto GPU...")
device = "cuda:0" if torch.cuda.is_available() else "cpu"

model_id = "Qwen/Qwen2-VL-7B-Instruct"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

model = Qwen2VLForConditionalGeneration.from_pretrained(
    model_id,
    quantization_config=bnb_config,
    device_map="auto",
)

# Lower max_pixels caps VRAM use per image; raise if you want more detail
processor = AutoProcessor.from_pretrained(
    model_id,
    min_pixels=256 * 28 * 28,
    max_pixels=1024 * 28 * 28,
)
print(f"✅ Model loaded successfully on {device.upper()}!")

# ==========================================
# 3. AI GENERATION & CLASSIFICATION UTILS
# ==========================================
SYSTEM_PROMPT = (
    "You are an image metadata generator for a Pinterest-style app. "
    "Given an image, respond with ONLY a single valid JSON object, no markdown fences, no extra text. "
    "Schema: {\"title\": string (<=60 chars), \"description\": string (1-2 sentences), "
    "\"tags\": array of 3-6 short lowercase keywords, "
    f"\"category\": one of exactly {VALID_CATEGORIES}}}"
)

def run_qwen_vl_task(image: Image.Image) -> dict:
    """Runs a single Qwen2-VL chat pass over the image and returns parsed metadata dict."""
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": SYSTEM_PROMPT},
            ],
        }
    ]

    text_prompt = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)

    inputs = processor(
        text=[text_prompt],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    ).to(device)

    with torch.no_grad():
        generated_ids = model.generate(**inputs, max_new_tokens=200, do_sample=False)

    generated_ids_trimmed = [
        out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0].strip()

    return parse_model_json(output_text)

def parse_model_json(raw_text: str) -> dict:
    """Extracts the JSON object from the model's raw text output, tolerating stray fences/text."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
    cleaned = re.sub(r"```$", "", cleaned).strip()

    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if not match:
        return {}
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return {}

def sanitize_result(result: dict) -> tuple:
    """Validates/normalizes model output, falling back to safe defaults."""
    title = str(result.get("title") or "AI Enriched Pin")[:60].title()

    description = str(result.get("description") or "").strip()
    if not description:
        description = title

    raw_tags = result.get("tags") or []
    if not isinstance(raw_tags, list):
        raw_tags = []
    tags = []
    for t in raw_tags:
        t = str(t).strip().lower()
        if t and t not in tags:
            tags.append(t)
    tags = tags[:6]

    category = str(result.get("category") or "").strip()
    if category not in VALID_CATEGORIES:
        category = classify_category_fallback(title, description, tags)

    return title, description, tags, category

def classify_category_fallback(title: str, description: str, tags: list) -> str:
    """Keyword-based safety net if the model returns an invalid/missing category."""
    corpus = f"{title} {description} {' '.join(tags)}".lower()

    mapping = {
        "Fashion": ["fashion", "show", "dress", "outfit", "lingerie", "wear", "suit", "jacket", "clothing", "model", "wearing"],
        "Portrait": ["portrait", "pose", "posing", "face", "eyes", "young woman", "man", "woman", "person"],
        "Cyberpunk": ["cyberpunk", "neon", "futuristic", "cyber", "synthwave", "hologram", "sci-fi"],
        "Architecture": ["architecture", "building", "structure", "interior", "house", "room", "arch", "cathedral", "bridge", "studio"],
        "Nature": ["nature", "tree", "forest", "mountain", "river", "landscape", "ocean", "sea", "sky", "flower", "grass", "outdoor"],
        "Space": ["space", "nebula", "galaxy", "stars", "cosmos", "planet", "astronomy"],
        "Tech": ["tech", "technology", "computer", "robot", "screen", "circuit", "digital", "gadget"],
        "Minimal": ["minimal", "minimalist", "clean", "simple", "empty", "white background", "isolated"],
        "Abstract": ["abstract", "pattern", "texture", "colors", "shapes", "geometric", "artistic", "paint"],
    }

    for cat, keywords in mapping.items():
        if any(kw in corpus for kw in keywords):
            return cat

    return "Fashion"  # Default safe fallback category

# ==========================================
# 4. APEXKIT NETWORK OPS
# ==========================================
def fetch_pins_needing_enrichment(page=1, per_page=20):
    """Fetches records from ApexKit."""
    url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/collections/{COLLECTION_NAME}/records"
    headers = {"Authorization": f"Bearer {APEXKIT_TOKEN}"}
    params = {"page": page, "per_page": per_page}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json().get("items", [])
    print(f"❌ Error fetching pins: {response.text}")
    return []

def download_image(filename: str) -> Image.Image | None:
    """Downloads the file from ApexKit storage into a PIL Image."""
    url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/storage/file/{filename}"
    response = requests.get(url)
    if response.status_code == 200:
        return Image.open(io.BytesIO(response.content)).convert("RGB")
    return None

def update_pin_record(record_id: int, title: str, description: str, tags: list, category: str):
    """Updates the existing record in ApexKit with AI generated metadata."""
    url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/collections/{COLLECTION_NAME}/records/{record_id}"
    headers = {
        "Authorization": f"Bearer {APEXKIT_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "data": {
            "title": title,
            "description": description,
            "tags": tags,
            "category": category,
        }
    }

    response = requests.put(url, headers=headers, json=payload)
    return response.status_code in [200, 201]

# ==========================================
# 5. MAIN PIPELINE
# ==========================================
def main():
    print(f"\n🚀 Starting AI Enrichment loop for tenant '{TENANT_ID}'...")
    page = 1

    while True:
        pins = fetch_pins_needing_enrichment(page=page, per_page=15)
        if not pins:
            print("🏁 No more records found. Enrichment finished!")
            break

        print(f"\n📄 Processing Page {page} ({len(pins)} records)...")

        for pin in pins:
            record_id = pin["id"]
            data = pin.get("data", {})
            image_filename = data.get("image")

            if not image_filename:
                continue

            print(f"\n🎨 Analyzing Pin ID {record_id} ({image_filename})...")

            # 1. Download image to GPU RAM buffer
            pil_image = download_image(image_filename)
            if not pil_image:
                print("  ⚠️ Failed to download image from storage.")
                continue

            # 2. Single Qwen2-VL pass: title + description + tags + category
            try:
                raw_result = run_qwen_vl_task(pil_image)
            except Exception as e:
                print(f"  ⚠️ Model inference failed: {e}")
                continue

            ai_title, ai_description, ai_tags, ai_category = sanitize_result(raw_result)

            print(f"  ✨ Title:       {ai_title}")
            print(f"  📝 Description: {ai_description[:80]}...")
            print(f"  🏷️  Tags:        {ai_tags}")
            print(f"  📂 Category:    {ai_category}")

            # 3. Push updates back to ApexKit
            success = update_pin_record(record_id, ai_title, ai_description, ai_tags, ai_category)
            if success:
                print("  💾 Successfully updated pin in ApexKit!")
            else:
                print("  ❌ Failed to update pin record.")

        page += 1
        time.sleep(0.5)

if __name__ == "__main__":
    main()