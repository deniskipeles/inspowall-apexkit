/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 37,
  "name": "pexels-seeder",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

import { Hono } from "https://esm.sh/hono";

const app = new Hono();

app.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const query = body.query || "minimalist architecture";
  const perPage = body.per_page || 15;

  const pexelsKey = await $env.get("PEXELS_API_KEY");
  if (!pexelsKey) {
    return c.json({ error: "PEXELS_API_KEY environment variable is missing" }, 500);
  }

  console.log(`[Pexels Seeder] Fetching images for query: "${query}"`);

  // 1. Fetch from Pexels API
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url, {
    headers: { "Authorization": pexelsKey }
  });

  if (!res.ok) {
    return c.json({ error: "Failed to fetch from Pexels API", details: await res.text() }, 502);
  }

  const data = await res.json();
  const photos = data.photos || [];

  console.log(`[Pexels Seeder] Found ${photos.length} photos. Processing...`);

  let seededCount = 0;
  let skippedCount = 0;
  let errors = [];

  // 2. Process and Seed Photos
  for (const photo of photos) {
    try {
      // Avoid duplicates
      const existing = await $db.records.list("pins", {
        filter: JSON.stringify({ "metadata.id": photo.id })
      });

      if (existing?.items?.length > 0) {
        skippedCount++;
        continue;
      }

      // Download Image into ArrayBuffer
      const imageUrl = photo.src.large2x || photo.src.original;
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) throw new Error("Failed to download image from Pexels");

      const arrayBuffer = await imgRes.arrayBuffer();
      const b64Data = $util.base64EncodeBuffer(arrayBuffer);

      // Save to Native Storage
      const fileResult = await $files.save(`pexels_${photo.id}.jpg`, b64Data, "image/jpeg");

      // Auto-Calculate Masonry Height
      const title = photo.alt || "Pexels Inspiration";
      const description = `Photography by ${photo.photographer} on Pexels.`;
      const origWidth = photo.width || 1000;
      const origHeight = photo.height || 1500;
      const masonryHeight = Math.min(Math.max((origHeight / origWidth) * 300, 200), 500);

      // Save Record to DB
      await $db.records.create("pins", {
        title: title.substring(0, 50).replace(/\b\w/g, char => char.toUpperCase()),
        description: description,
        category: "photography",
        tags: ["pexels", "inspiration"],
        image: fileResult.filename,
        height: Math.round(masonryHeight),
        likes_count: 0,
        metadata: photo
      });

      seededCount++;
      console.log(`[Pexels Seeder] Seeded photo ID: ${photo.id}`);

    } catch (err) {
      console.error(`[Pexels Seeder] Error on photo ${photo.id}:`, err.message);
      errors.push({ id: photo.id, error: err.message });
    }
  }

  return c.json({
    success: true,
    message: `Seeding complete. Seeded: ${seededCount}, Skipped: ${skippedCount}, Errors: ${errors.length}`,
    seeded: seededCount,
    skipped: skippedCount,
    errors
  });
});

export default async function (req) {
  return app.fetch(req);
}