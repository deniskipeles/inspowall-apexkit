/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 9,
  "name": "seed-images",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

export default async function () {
    console.log("Seeder Cron: Booting parallel ingestion sequence...");

    const FEEDER_SERVICE_URL = "http://127.0.0.1:8000"; // Update with your deployed seeder host
    const COLLECTION_NAME = "pins";

    try {
        // 1. Fetch existing pins from the DB to extract seeded photo IDs and tag pool
        const dbResult = await $db.records.list(COLLECTION_NAME, { limit: 1000000 });
        const pins = dbResult.items || [];

        console.log(`Seeder Cron: Fetched ${pins.length} existing records from DB.`);

        const seededIds = [];
        const tagPool = [];

        // 2. Loop over and parse metadata IDs and logged tags
        for (const pin of pins) {
            if (pin?.data?.metadata && pin?.data?.metadata?.id) {
                seededIds.push(String(pin?.data?.metadata?.id));
            }
            if (Array.isArray(pin?.data?.tags)) {
                tagPool.push(...pin?.data?.tags);
            }
        }

        // 3. Filter out system and structural tags
        const stopwords = ["vortex", "unsplash", "pexels", "imported", "pins", "model"];
        const uniqueTags = Array.from(new Set(tagPool.map(t => t.toLowerCase())))
            .filter(t => !stopwords.includes(t));

        if (uniqueTags.length < 2) {
            uniqueTags.push("portrait", "lifestyle", "aesthetic", "editorial");
        }

        // --- SAFE RANDOM SAMPLING (Replaces problematic .sort() hack) ---
        const sampledTags = [];
        const tempTags = [...uniqueTags];
        while (sampledTags.length < 2 && tempTags.length > 0) {
            const randomIndex = Math.floor(Math.random() * tempTags.length);
            sampledTags.push(tempTags.splice(randomIndex, 1)[0]);
        }

        const searchQuery = sampledTags.join(", ");

        console.log(`Seeder Cron: Generated query "${searchQuery}" (Excluding ${seededIds.length} unique photo IDs).`);

        // 4. Construct the structured payload
        const payload = {
            ids: seededIds,
            search_query: searchQuery,
            pages: 1,
            per_page: 30
        };

        // 5. Trigger both seeder platforms simultaneously in parallel
        const unsplashDispatch = $http.post(`${FEEDER_SERVICE_URL}/seed/unsplash`, payload);
        const pexelsDispatch = $http.post(`${FEEDER_SERVICE_URL}/seed/pexels`, payload);

        const [unsplashRes, pexelsRes] = await Promise.all([unsplashDispatch, pexelsDispatch]);

        console.log(`Seeder Cron: Dispatched Unsplash: ${unsplashRes}`);
        console.log(`Seeder Cron: Dispatched Pexels: ${pexelsRes}`);
    } catch (e) {
        console.log("Seeder Cron: Critical run error: " + e.message);
    }
}