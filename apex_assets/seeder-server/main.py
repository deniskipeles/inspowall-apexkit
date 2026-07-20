# ==========================================
# IMPORTS & ENVIRONMENT LOADER
# ==========================================
import os
import json
import time
import random
import threading
from typing import Optional, List, Dict
import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException, Query, status
from pydantic import BaseModel

# --- ROBUST .ENV LOADER (Zero-Dependency + python-dotenv fallback) ---
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("ℹ️ Loaded environment variables via python-dotenv")
except ImportError:
    # Manual parser fallback if python-dotenv is not installed in your .venv
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip().strip('"').strip("'")
        print("ℹ️ Loaded environment variables via manual .env parser")
    else:
        print("⚠️ No .env file found. Relying on system environment variables.")

# ==========================================
# CONFIGURATION
# ==========================================
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "your-unsplash-access-key")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "your-pexels-api-key")
APEXKIT_BASE_URL = os.getenv("APEXKIT_BASE_URL", "http://127.0.0.1:5000").rstrip("/")
APEXKIT_TOKEN = os.getenv("APEXKIT_TOKEN", "YOUR_APEXKIT_ADMIN_TOKEN")
TENANT_ID = os.getenv("TENANT_ID", "vortex")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "pins")

# ==========================================
# THREAD-SAFE IN-MEMORY STATE MANAGER
# ==========================================
class SeederState:
    def __init__(self, platform_name: str):
        self.platform = platform_name
        self.status = "idle"
        self.logs: List[str] = []
        self.last_run: Optional[str] = None
        self.error: Optional[str] = None
        self.lock = threading.Lock()

    def log(self, message: str):
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        line = f"[{timestamp}] [{self.platform.upper()}] {message}"
        self.logs.append(line)
        if len(self.logs) > 150:  # Keep only last 150 lines
            self.logs.pop(0)
        print(line)

    def start(self):
        self.status = "running"
        self.error = None
        self.logs.clear()
        self.log(f"Starting seeding run...")

    def finish(self, success: bool, err_msg: Optional[str] = None):
        self.status = "idle"
        self.last_run = time.strftime("%Y-%m-%d %H:%M:%S")
        if not success:
            self.error = err_msg
            self.log(f"Run failed: {err_msg}")


unsplash_state = SeederState("unsplash")
pexels_state = SeederState("pexels")

# ==========================================
# FASTAPI APP SETUP
# ==========================================
app = FastAPI(
    title="ApexKit Seeder Microservice",
    description="Asynchronous execution and status endpoints for Pexels and Unsplash seeding.",
    version="1.0.0"
)

class SeedRequest(BaseModel):
    ids: List[str]
    search_query: str
    pages: Optional[int] = 1
    per_page: Optional[int] = 20

class StatusResponse(BaseModel):
    platform: str
    status: str
    last_run: Optional[str]
    error: Optional[str]
    logs: List[str]

class QuerySuggestionResponse(BaseModel):
    query: str
    source_pool_size: int

# ==========================================
# SEEDER RUNTIME CORE FUNCTIONS
# ==========================================
def upload_to_apexkit(state: SeederState, image_url: str, filename: str) -> Optional[str]:
    img_res = requests.get(image_url)
    if img_res.status_code != 200:
        return None
        
    upload_url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/storage/upload"
    headers = {"x-api-key": f"{APEXKIT_TOKEN}"}
    files = {'file': (filename, img_res.content, 'image/jpeg')}
    
    response = requests.post(upload_url, headers=headers, files=files)
    if response.status_code in [200, 201]:
        return response.json().get("filename")
    return None


def create_record(state: SeederState, filename: str, photo: dict, category: str, tags: List[str]) -> bool:
    title = (photo.get('alt_description') or photo.get('description') or photo.get('alt') or "Untitled").title()[:50]
    description = photo.get('description') or photo.get('alt') or f"Photography on {state.platform.title()}."
    likes = photo.get('likes', 0)
    
    orig_width = photo.get('width', 1000)
    orig_height = photo.get('height', 1500)
    aspect_ratio = orig_height / orig_width
    masonry_height = round(min(max(aspect_ratio * 300, 200), 500))

    payload = {
        "data": {
            "title": title,
            "description": description,
            "category": category,
            "tags": list(set(tags))[:5],
            "image": filename,
            "height": masonry_height,
            "likes_count": likes,
            "metadata": photo
        }
    }

    record_url = f"{APEXKIT_BASE_URL}/tenant/{TENANT_ID}/api/v1/collections/{COLLECTION_NAME}/records"
    headers = {
        "x-api-key": f"{APEXKIT_TOKEN}",
        "Content-Type": "application/json"
    }

    response = requests.post(record_url, headers=headers, json=payload)
    return response.status_code in [200, 201]

# ==========================================
# ASYNC WORKER TASK LOOP EXECUTIONS (UPDATED)
# ==========================================
def run_unsplash_seeder(query: str, start_page: int, max_pages: int, per_page: int, payload_ids: List[str]):
    state = unsplash_state
    state.start()
    
    try:
        # Re-construct unique tracked set entirely in-memory from payload values
        tracked_ids = set(payload_ids)
        new_images_seeded = 0

        page = start_page
        while page < (start_page + max_pages):
            state.log(f"Fetching Unsplash search results for query '{query}' (Page {page})...")
            url = "https://api.unsplash.com/search/photos"
            params = {"query": query, "page": page, "per_page": per_page, "orientation": "portrait"}
            headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}", "Accept-Version": "v1"}

            res = requests.get(url, headers=headers, params=params)
            if res.status_code != 200:
                raise Exception(f"Unsplash API Error: {res.text}")
                
            data = res.json()
            photos = data.get("results", [])
            if not photos:
                break
                
            for photo in photos:
                photo_id = photo['id']
                if photo_id in tracked_ids:
                    continue
                    
                filename = upload_to_apexkit(state, photo['urls']['regular'], f"unsplash_{photo_id}.jpg")
                if filename:
                    category = "female model"
                    for topic, details in photo.get('topic_submissions', {}).items():
                        if isinstance(details, dict) and details.get('status') == 'approved':
                            category = topic.replace("-", " ").title()
                            break
                            
                    tags = ["unsplash", "vortex", "model"]
                    if 'tags' in photo:
                        tags.extend([t.get('title') for t in photo['tags'] if 'title' in t])
                        
                    if create_record(state, filename, photo, category, tags):
                        tracked_ids.add(photo_id)
                        new_images_seeded += 1
                    time.sleep(1)
            page += 1
            time.sleep(2)
            
        state.log(f"Successfully seeded {new_images_seeded} new images from Unsplash.")
        state.finish(True)
    except Exception as e:
        state.finish(False, str(e))


def run_pexels_seeder(query: str, start_page: int, max_pages: int, per_page: int, payload_ids: List[str]):
    state = pexels_state
    state.start()
    
    try:
        # Re-construct unique tracked set entirely in-memory from payload values
        tracked_ids = set()
        for p_id in payload_ids:
            try:
                tracked_ids.add(int(p_id))
            except (ValueError, TypeError):
                pass
                
        new_images_seeded = 0

        page = start_page
        while page < (start_page + max_pages):
            state.log(f"Fetching Pexels search results for query '{query}' (Page {page})...")
            url = "https://api.pexels.com/v1/search"
            params = {"query": query, "page": page, "per_page": per_page, "orientation": "portrait"}
            headers = {"Authorization": PEXELS_API_KEY}

            res = requests.get(url, headers=headers, params=params)
            if res.status_code != 200:
                raise Exception(f"Pexels API Error: {res.text}")
                
            data = res.json()
            photos = data.get("photos", [])
            if not photos:
                break
                
            for photo in photos:
                photo_id = photo['id']
                if photo_id in tracked_ids:
                    continue
                    
                filename = upload_to_apexkit(state, photo['src']['large2x'], f"pexels_{photo_id}.jpg")
                if filename:
                    alt_text = photo.get('alt', "")
                    stopwords = {"a", "an", "the", "in", "on", "of", "and", "or", "with", "is", "are"}
                    tags = ["pexels", "vortex", "model"]
                    if alt_text:
                        words = [w.strip(".,").lower() for w in alt_text.split()]
                        derived = [w for w in words if w and w not in stopwords and w.isalpha()]
                        tags.extend(derived[:4])
                        
                    if create_record(state, filename, photo, "black woman", tags):
                        tracked_ids.add(photo_id)
                        new_images_seeded += 1
                    time.sleep(1)
            page += 1
            time.sleep(2)
            
        state.log(f"Successfully seeded {new_images_seeded} new images from Pexels.")
        state.finish(True)
    except Exception as e:
        state.finish(False, str(e))


# Helper wrappers to handle thread locks cleanly
def run_unsplash_seeder_with_lock(query: str, pages: int, per_page: int, ids: List[str]):
    with unsplash_state.lock:
        run_unsplash_seeder(query, 1, pages, per_page, ids)

def run_pexels_seeder_with_lock(query: str, pages: int, per_page: int, ids: List[str]):
    with pexels_state.lock:
        run_pexels_seeder(query, 1, pages, per_page, ids)

# ==========================================
# ENDPOINTS
# ==========================================
@app.get("/status/{platform}", response_model=StatusResponse)
def get_status(platform: str):
    if platform == "unsplash":
        state = unsplash_state
    elif platform == "pexels":
        state = pexels_state
    else:
        raise HTTPException(status_code=404, detail="Platform not found. Use 'unsplash' or 'pexels'.")
        
    return StatusResponse(
        platform=state.platform,
        status=state.status,
        last_run=state.last_run,
        error=state.error,
        logs=state.logs
    )

@app.post("/seed/unsplash", status_code=status.HTTP_202_ACCEPTED)
def trigger_unsplash_seeder(
    req: SeedRequest,
    background_tasks: BackgroundTasks
):
    if not unsplash_state.lock.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Unsplash seeder task is already actively running."
        )
    unsplash_state.lock.release()
    
    background_tasks.add_task(
        run_unsplash_seeder_with_lock, req.search_query, req.pages, req.per_page, req.ids
    )
    return {"message": "Unsplash seeder triggered in background", "query": req.search_query}


@app.post("/seed/pexels", status_code=status.HTTP_202_ACCEPTED)
def trigger_pexels_seeder(
    req: SeedRequest,
    background_tasks: BackgroundTasks
):
    if not pexels_state.lock.acquire(blocking=False):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, 
            detail="Pexels seeder task is already actively running."
        )
    pexels_state.lock.release()
    
    background_tasks.add_task(
        run_pexels_seeder_with_lock, req.search_query, req.pages, req.per_page, req.ids
    )
    return {"message": "Pexels seeder triggered in background", "query": req.search_query}


@app.get("/suggest-query", response_model=QuerySuggestionResponse)
def suggest_query():
    """Queries DB records, extracts logged tags, and assembles a randomized comma-separated search string."""
    url = f"{APEXKIT_BASE_URL}/api/v1/collections/{COLLECTION_NAME}/records"
    headers = {"x-api-key": f"{APEXKIT_TOKEN}"}
    
    try:
        # 1. Fetch total count of records
        res = requests.get(url, headers=headers, params={"per_page": 1})
        if res.status_code != 200:
            raise Exception("Failed to query DB count")
            
        total = res.json().get("total", 0)
        if total == 0:
            return QuerySuggestionResponse(query="model, lifestyle", source_pool_size=0)
            
        # 2. Grab a random page to ensure tag diversity
        per_page = 50
        total_pages = max(1, total // per_page)
        random_page = random.randint(1, total_pages)
        
        res = requests.get(url, headers=headers, params={"page": random_page, "per_page": per_page})
        records = res.json().get("items", [])
        
        # 3. Pull and flatten tags
        all_tags = []
        for r in records:
            tags = r.get("tags", [])
            if isinstance(tags, list):
                all_tags.extend(tags)
                
        # Filter out system and structural tags
        system_stopwords = {"vortex", "unsplash", "pexels", "imported"}
        unique_tags = list(set([t.lower() for t in all_tags if t.lower() not in system_stopwords]))
        
        # Fallback pool if database contains insufficient data
        if len(unique_tags) < 2:
            unique_tags.extend(["aesthetic", "editorial", "portrait", "fashion", "melanin", "vintage"])
            
        # Sample 2 randomized terms
        sampled = random.sample(unique_tags, min(len(unique_tags), 2))
        query_str = ", ".join(sampled)
        
        return QuerySuggestionResponse(query=query_str, source_pool_size=len(unique_tags))
        
    except Exception as e:
        # Fallback parameters on failure
        fallback_terms = ["editorial", "fashion", "melanin", "vintage", "beauty"]
        fallback_query = ", ".join(random.sample(fallback_terms, 2))
        return QuerySuggestionResponse(query=fallback_query, source_pool_size=0)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)