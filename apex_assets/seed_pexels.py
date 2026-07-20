import os
import json
import time
import requests
import random

# ==========================================
# CONFIGURATION
# ==========================================
PEXELS_API_KEY = "get-one-from-there-site"
APEXKIT_BASE_URL = "http://127.0.0.1:5000"  # Change if hosted remotely
APEXKIT_TOKEN = "YOUR_APEXKIT_ADMIN_TOKEN"  # JWT or API Key
TENANT_ID = "vortex"
COLLECTION_NAME = "pins"

# The specific search query and pagination configuration
START_PAGE = 1
TOTAL_PAGES = 10
PER_PAGE = 50
SEARCH_QUERY = "black woman, lady or a girl"
DEFAULT_CATEGORY = "black woman"
PRODUCTION = "production-"
# File to keep track of successfully uploaded image IDs
TRACKING_FILE = PRODUCTION + "pexels-successful-fetched-images.json"

# ==========================================
# TRACKING UTILS
# ==========================================
def load_tracked_ids():
    """Load previously fetched Pexels IDs to avoid duplicates."""
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, 'r') as f:
            try:
                return set(json.load(f))
            except json.JSONDecodeError:
                return set()
    return set()

def save_tracked_id(photo_id):
    """Save a successfully processed ID to the tracking file."""
    tracked = load_tracked_ids()
    tracked.add(photo_id)
    with open(TRACKING_FILE, 'w') as f:
        json.dump(list(tracked), f, indent=2)

# ==========================================
# INCREMENTAL DATABASE SYNC
# ==========================================
def sync_tracker_from_db(tracked_ids):
    """Fetch already seeded records from ApexKit in bulks of 100 and sync them to the tracker."""
    print("\n🔄 Syncing tracker with existing records in ApexKit DB...")
    current_page = 1
    per_page = 100
    total_items = None
    new_ids_found = 0
    
    headers = {
        "Authorization": f"Bearer {APEXKIT_TOKEN}"
    }
    record_url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/collections/{COLLECTION_NAME}/records"
    
    while True:
        params = {
            "page": current_page,
            "per_page": per_page
        }
        try:
            response = requests.get(record_url, headers=headers, params=params)
            if response.status_code != 200:
                print(f"  ⚠️  Unable to sync from DB (Status {response.status_code}). Proceeding with current local tracker.")
                break
                
            res_data = response.json()
            items = res_data.get("items", [])
            
            if total_items is None:
                total_items = res_data.get("total", 0)
                print(f"  📊 DB contains {total_items} records.")
                
            if not items:
                break
                
            for record in items:
                metadata = record.get("metadata")
                if isinstance(metadata, dict):
                    pexels_id = metadata.get("id")
                    if pexels_id is not None:
                        pexels_id_int = int(pexels_id)
                        if pexels_id_int not in tracked_ids:
                            tracked_ids.add(pexels_id_int)
                            new_ids_found += 1
            
            if current_page * per_page >= total_items:
                break
            current_page += 1
        except Exception as e:
            print(f"  ⚠️  Sync error: {e}. Proceeding with current local tracker.")
            break
            
    if new_ids_found > 0:
        print(f"  ✅ Sync complete. Added {new_ids_found} missing IDs to local tracker.")
        with open(TRACKING_FILE, 'w') as f:
            json.dump(list(tracked_ids), f, indent=2)
    else:
        print("  ✅ Tracker is already fully in sync with the database.")

# ==========================================
# PEXELS API
# ==========================================
def fetch_pexels_search(query, page=1, per_page=15):
    """Fetch photos from Pexels. Returns a tuple: (results_list, total_pages)"""
    print(f"📸 Searching Pexels for '{query}' (Page {page}, Per Page {per_page})...")

    url = "https://api.pexels.com/v1/search"
    params = {
        "query": query,
        "page": page,
        "per_page": per_page,
        "orientation": "portrait"
    }
    headers = {
        "Authorization": PEXELS_API_KEY  # NOTE: raw key, no "Bearer"/"Client-ID" prefix
    }

    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        print(f"❌ Pexels API Error: {response.text}")
        return [], 0

    data = response.json()
    results = data.get("photos", [])
    total_results = data.get("total_results", 0)
    total_pages = max(1, -(-total_results // per_page))  # ceil division
    return results, total_pages

# ==========================================
# APEXKIT UPLOAD & SEED
# ==========================================
def upload_image_to_apexkit(image_url, original_filename):
    """Download image from Pexels and upload it to ApexKit storage."""
    print("  ⬇️  Downloading image from Pexels...")
    img_res = requests.get(image_url)
    if img_res.status_code != 200:
        print("  ❌ Failed to download image.")
        return None

    img_bytes = img_res.content

    print("  ☁️  Uploading to ApexKit...")
    upload_url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/storage/upload"
    headers = {
        "Authorization": f"Bearer {APEXKIT_TOKEN}"
    }
    files = {
        'file': (original_filename, img_bytes, 'image/jpeg')
    }

    response = requests.post(upload_url, headers=headers, files=files)
    if response.status_code in [200, 201]:
        return response.json().get("filename")
    else:
        print(f"  ❌ Upload failed: {response.text}")
        return None

def extract_tags_from_alt(alt_text):
    """Pexels has no tag/topic taxonomy, so derive simple tags from the alt-text description."""
    if not alt_text:
        return []
    stopwords = {"a", "an", "the", "in", "on", "of", "and", "or", "with", "is", "are", "to", "by", "for", "at", "from"}
    words = [w.strip(".,").lower() for w in alt_text.split()]
    unique = []
    for w in words:
        if w and w not in stopwords and w.isalpha() and w not in unique:
            unique.append(w)
    return unique[:4]

def create_pin_record(filename, photo_data):
    """Create a record in the ApexKit pins collection."""

    # Extract Title (Pexels has no title/description field, just 'alt')
    alt_text = photo_data.get('alt') or ""
    title = alt_text.title()[:50] if alt_text else "Untitled"

    # Extract Description (Pexels doesn't provide a separate long description either)
    description = alt_text or f"{SEARCH_QUERY.title()} photography on Pexels."

    # Pexels API does not expose a likes count (unlike Unsplash) — default to 0
    likes_count = 0

    # Pexels has no approved-topic taxonomy like Unsplash, so category falls back to default
    category = DEFAULT_CATEGORY

    # Extract Tags — no tags array from Pexels, so derive from alt text plus fixed labels
    tags = ["pexels", "vortex", DEFAULT_CATEGORY]
    tags.extend(extract_tags_from_alt(alt_text))

    # Calculate approximate responsive masonry height
    orig_width = photo_data.get('width', 1000)
    orig_height = photo_data.get('height', 1500)
    aspect_ratio = orig_height / orig_width
    masonry_height = min(max(aspect_ratio * 300, 200), 500)

    # Build DB payload
    payload = {
        "data": {
            "title": title,
            "description": description,
            "category": category,
            "tags": list(set(tags))[:5],
            "image": filename,
            "height": round(masonry_height),
            "likes_count": likes_count,
            "metadata": photo_data  # Dump raw JSON response directly
        }
    }

    record_url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/collections/{COLLECTION_NAME}/records"
    headers = {
        "Authorization": f"Bearer {APEXKIT_TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(record_url, headers=headers, json=payload)
    if response.status_code in [200, 201]:
        print(f"  ✅ Successfully created Pin: {title} (Category: {category})")
        return True
    else:
        print(f"  ❌ Failed to create record: {response.text}")
        return False

# ==========================================
# MAIN ROUTINE
# ==========================================
def main():
    print(f"🚀 Starting Pexels seeder for tenant '{TENANT_ID}'")

    tracked_ids = load_tracked_ids()
    print(f"📂 Loaded {len(tracked_ids)} processed image IDs from tracker.")

    # Synchronize with the database before executing the seeding loop
    sync_tracker_from_db(tracked_ids)

    current_page = START_PAGE
    total_pages = TOTAL_PAGES  # Initialized, will update dynamically after the first page fetch

    while current_page <= total_pages:
        print(f"\n--- 📦 Processing Page {current_page} of {total_pages} ---")
        photos, retrieved_total_pages = fetch_pexels_search(
            query=SEARCH_QUERY,
            page=current_page,
            per_page=PER_PAGE
        )

        # Dynamically align the maximum page count with Pexels' actual search results
        if current_page == START_PAGE:
            print(f"📊 Pexels reports {retrieved_total_pages} total pages are available for this query.")
            total_pages = min(retrieved_total_pages, TOTAL_PAGES)

        if not photos:
            print("⏹️  No photos retrieved. Exiting loop.")
            break

        for index, photo in enumerate(photos):
            photo_id = photo['id']
            print(f"\nProcessing {index + 1}/{len(photos)} (ID: {photo_id})")

            if photo_id in tracked_ids:
                print("  ⏭️  Already processed. Skipping.")
                continue

            image_url = photo['src']['large2x']
            original_filename = f"pexels_{photo_id}.jpg"

            # 1. Download & Upload Image
            saved_filename = upload_image_to_apexkit(image_url, original_filename)

            if saved_filename:
                # 2. Record Creation
                success = create_pin_record(saved_filename, photo)

                # 3. Track to avoid duplicate fetches
                if success:
                    save_tracked_id(photo_id)
                    tracked_ids.add(photo_id)

                # Yield context briefly to mitigate hitting request limits rapidly
                time.sleep(1)

        # Advance page and apply a 2-second rate-limiting buffer between requests
        current_page += 1
        time.sleep(2)

    print("\n🎉 Seeding finished successfully!")

if __name__ == "__main__":
    main()