import io
import os
import re
import time
import torch
import requests
from PIL import Image
from unittest.mock import patch

# ==========================================
# 0. FLORENCE-2 COMPATIBILITY MONKEY-PATCHES
# ==========================================
import transformers

# Patch 1: Fix AttributeError for forced_bos_token_id on transformers >= 4.45
if hasattr(transformers, "configuration_utils"):
    orig_getattribute = transformers.configuration_utils.PretrainedConfig.__getattribute__
    def patched_getattribute(self, name):
        try:
            return orig_getattribute(self, name)
        except AttributeError:
            if name in ("forced_bos_token_id", "forced_eos_token_id"):
                return None
            raise
    transformers.configuration_utils.PretrainedConfig.__getattribute__ = patched_getattribute

# Patch 2: Bypasses unnecessary flash_attn requirement checks
from transformers.dynamic_module_utils import get_imports
def fixed_get_imports(filename: str | os.PathLike) -> list[str]:
    if not str(filename).endswith("modeling_florence2.py"):
        return get_imports(filename)
    imports = get_imports(filename)
    if "flash_attn" in imports:
        imports.remove("flash_attn")
    return imports

from transformers import AutoProcessor, AutoModelForCausalLM

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
# 2. LOAD VISION MODEL (Florence-2-large)
# ==========================================
print("🤖 Loading Florence-2-Large onto GPU...")
device = "cuda:0" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

model_id = "microsoft/Florence-2-large"

with patch("transformers.dynamic_module_utils.get_imports", fixed_get_imports):
    model = AutoModelForCausalLM.from_pretrained(
        model_id, 
        torch_dtype=torch_dtype, 
        trust_remote_code=True
    ).to(device)

processor = AutoProcessor.from_pretrained(model_id, trust_remote_code=True)
print(f"✅ Model loaded successfully on {device.upper()}!")

# ==========================================
# 3. AI GENERATION & CLASSIFICATION UTILS
# ==========================================
def run_florence_task(image: Image.Image, task_prompt: str) -> str:
    """Runs a specific Florence-2 prompt task against a PIL image."""
    inputs = processor(text=task_prompt, images=image, return_tensors="pt").to(device, torch_dtype)
    
    generated_ids = model.generate(
        input_ids=inputs["input_ids"],
        pixel_values=inputs["pixel_values"],
        max_new_tokens=150,
        num_beams=3
    )
    
    generated_text = processor.batch_decode(generated_ids, skip_special_tokens=False)[0]
    parsed_answer = processor.post_process_generation(
        generated_text, 
        task=task_prompt, 
        image_size=(image.width, image.height)
    )
    return parsed_answer.get(task_prompt, "").strip()

def extract_tags_from_text(text: str) -> list:
    """Simple stopword-filtered keyword extractor to build tags."""
    stopwords = {"a", "an", "the", "in", "on", "of", "and", "or", "with", "is", "are", "to", "by", "for", "at", "from", "background", "foreground", "image", "photo", "picture", "shows", "featuring"}
    words = re.findall(r'\b[a-zA-Z]{3,12}\b', text.lower())
    unique_tags = []
    for w in words:
        if w not in stopwords and w not in unique_tags:
            unique_tags.append(w)
    return unique_tags[:6]  # Return top 6 tags

def classify_category(title: str, description: str, tags: list) -> str:
    """Classifies generated text into one of the valid Vortex category tags."""
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
        "Abstract": ["abstract", "pattern", "texture", "colors", "shapes", "geometric", "artistic", "paint"]
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
        "Content-Type": "application/json"
    }
    
    payload = {
        "data": {
            "title": title,
            "description": description,
            "tags": tags,
            "category": category  # <--- UPDATED PAYLOAD
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
                
            # 2. Generate Title (<CAPTION> task)
            raw_title = run_florence_task(pil_image, "<CAPTION>")
            ai_title = raw_title.title()[:60] if raw_title else "AI Enriched Pin"
            
            # 3. Generate Description (<MORE_DETAILED_CAPTION> task)
            ai_description = run_florence_task(pil_image, "<MORE_DETAILED_CAPTION>")
            if not ai_description:
                ai_description = raw_title
                
            # 4. Extract Tags
            ai_tags = extract_tags_from_text(ai_description)
            
            # 5. Classify Category based on text semantics
            ai_category = classify_category(ai_title, ai_description, ai_tags)
            
            print(f"  ✨ Title:       {ai_title}")
            print(f"  📝 Description: {ai_description[:80]}...")
            print(f"  🏷️  Tags:        {ai_tags}")
            print(f"  📂 Category:    {ai_category}")
            
            # 6. Push updates back to ApexKit
            success = update_pin_record(record_id, ai_title, ai_description, ai_tags, ai_category)
            if success:
                print("  💾 Successfully updated pin in ApexKit!")
            else:
                print("  ❌ Failed to update pin record.")
                
        page += 1
        time.sleep(0.5)

if __name__ == "__main__":
    main()