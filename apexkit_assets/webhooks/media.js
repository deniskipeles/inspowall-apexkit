/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 33,
  "name": "media",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

import { Hono } from "https://esm.sh/hono";
import { processAndCacheImage } from "@/custom/media-helper";

const app = new Hono();

// =========================================================
// NATIVE PROXIED & CACHED WEBP IMAGE STREAM (GET /image/:filename)
// =========================================================
app.get("/image/:filename", async (c) => {
  const filename = c.req.param("filename");
  const thumb = c.req.query("thumb");
  const quality = c.req.query("quality") || "80";
  const format = c.req.query("format") || "webp"; // Default to WebP
  const blur = c.req.query("blur");

  try {
    const result = await processAndCacheImage(filename, {
      thumb,
      quality,
      format,
      blur,
    });

    const byteLength = result.buffer.byteLength || result.buffer.length || 0;
    const isCacheable = byteLength >= 2048;

    return new Response(result.buffer, {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Cache-Control": isCacheable
          ? "public, max-age=31536000, immutable"
          : "no-store, no-cache, must-revalidate, max-age=0",
        "X-Media-Cache": result.hit ? "HIT" : "MISS",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    return new Response(`Media stream error: ${err.message}`, {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-store, no-cache, max-age=0",
      },
    });
  }
});

export default async function (req) {
  return app.fetch(req);
}