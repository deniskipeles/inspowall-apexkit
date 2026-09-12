/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 36,
  "name": "og",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

import { Hono } from "https://esm.sh/hono";
import { getCachedOgImage, cacheOgImage, processDataPayload } from "@/custom/og-helper";

const app = new Hono();

// ==========================================
// 1. STORE / CREATE CONFIG (POST /store)
// ==========================================
app.post("/store", async (c) => {
  const clientKey = c.req.header("x-og-api-key") || c.req.header("X-Og-Api-Key") || "";
  if (!clientKey) return c.json({ error: "Missing x-og-api-key header" }, 401);

  let keyRecord = null;
  try {
    const keyQuery = await $db.records.list("og_api_keys", { filter: JSON.stringify({ key: clientKey, active: true }) });
    if (!keyQuery?.items?.length) return c.json({ error: "Invalid x-og-api-key" }, 403);
    keyRecord = keyQuery.items[0].data || keyQuery.items[0];
  } catch (e) {
    console.error("[OG Store] Database error validating key:", e);
    return c.json({ error: "Database error validating key" }, 500);
  }

  const body = await c.req.json();
  const { templateId, format, quality, data } = body;

  if (!Array.isArray(data)) return c.json({ error: "'data' must be an array" }, 400);

  const imgFormat = ["jpg", "jpeg"].includes(format) ? "jpeg" : format === "webp" ? "webp" : "png";
  const imgQuality = Math.min(Math.max(Number(quality) || 85, 1), 100);

  let processedData;
  try {
    processedData = await processDataPayload(data);
  } catch (e) {
    console.error("[OG Store] Payload processing error:", e);
    return c.json({ error: e.message }, 400);
  }

  const finalTemplateId = templateId || "default-opengraph";
  const hashPayload = `${finalTemplateId}:${imgFormat}:${imgQuality}:${JSON.stringify(processedData)}`;
  const hash = $util.hash(hashPayload, "sha256").substring(0, 24);

  const firstImage = processedData.find(d => d.type === "image");
  const titleVar = processedData.find(d => d.target === "TITLE");
  const subtitleVar = processedData.find(d => d.target === "SUBTITLE");
  const siteVar = processedData.find(d => d.target === "SITE_NAME");
  const photographerVar = processedData.find(d => d.target === "PHOTOGRAPHER");
  const platformVar = processedData.find(d => d.target === "PLATFORM");
  
  let safePlatform = (platformVar?.value || "inspowall").toLowerCase();
  if (!["unsplash", "pexels", "inspowall"].includes(safePlatform)) {
      safePlatform = "inspowall";
  }

  const configData = {
    hash,
    template_id: finalTemplateId,
    format: imgFormat,
    quality: String(imgQuality),
    saved_filename: firstImage?.value || "default",
    platform: safePlatform,
    title_line_1: titleVar?.value || "",
    subtitle: subtitleVar?.value || "",
    site_name: siteVar?.value || "",
    photographer: photographerVar?.value || ""
  };

  if (keyRecord && keyRecord.id) {
      configData.api_key_id = keyRecord.id;
  }

  try {
    await $cache.set(`og_hash:${hash}`, JSON.stringify({ ...configData, data_payload: processedData }), 31536000);
  } catch (e) {
    console.error("[OG Store] Cache set failed:", e);
  }

  try {
    const existing = await $db.records.list("og_configs", { filter: JSON.stringify({ hash }) });
    if (existing?.items?.length > 0) {
      await $db.records.update("og_configs", existing.items[0].id, configData);
    } else {
      await $db.records.create("og_configs", configData);
    }
  } catch (e) {
    console.error("[OG Store] DB save failed:", e);
  }

  return c.json({ success: true, hash, format: imgFormat });
});

// ==========================================
// 2. RESOLVE & SERVE CACHED IMAGE (GET /image/:hash)
// ==========================================
app.get("/image/:hash", async (c) => {
  let rawParam = c.req.param("hash") || "";
  const hash = rawParam.replace(/\.(jpg|jpeg|png|webp)$/i, "").trim();

  if (!hash) return c.json({ error: "Missing hash" }, 400);

  // A. Check Local VFS Cache First
  try {
    const cachedBuffer = await getCachedOgImage(hash);
    if (cachedBuffer) {
      const isCacheable = cachedBuffer.byteLength >= 2048;
      return new Response(cachedBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": isCacheable ? "public, max-age=31536000, immutable" : "no-store, max-age=0"
        }
      });
    }
  } catch (e) {
    console.error("[OG Image] VFS Cache check error:", e);
  }

  // B. Not in VFS Cache, Resolve Config
  let configData = null;
  try {
    const cachedStr = await $cache.get(`og_hash:${hash}`);
    if (cachedStr) {
      configData = typeof cachedStr === "string" ? JSON.parse(cachedStr) : cachedStr;
    }
  } catch (e) {
    console.error("[OG Image] Cache lookup error:", e);
  }

  if (!configData) {
    try {
      const dbQuery = await $db.records.list("og_configs", { filter: JSON.stringify({ hash }) });
      if (dbQuery?.items?.length > 0) {
        configData = dbQuery.items[0].data || dbQuery.items[0];
        await $cache.set(`og_hash:${hash}`, JSON.stringify(configData), 31536000);
      }
    } catch (e) {
      console.error("[OG Image] DB lookup error:", e);
    }
  }

  if (!configData) {
    return new Response(JSON.stringify({ error: "OpenGraph configuration not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store, max-age=0" }
    });
  }

  let ogData = [];
  if (Array.isArray(configData.data_payload)) {
    ogData = configData.data_payload.map(item => {
      if (item.type === "image" && !item.value.startsWith("data:") && !item.value.startsWith("http")) {
        let val = item.value;
        if (item.params && Object.keys(item.params).length > 0) {
          const qsParts = Object.entries(item.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
          val += `?${qsParts.join("&")}`;
        }
        return { type: "image", target: item.target, value: val };
      }
      return item;
    });
  } else {
    ogData = [
      { type: "image", target: "IMAGE_URL", value: configData.saved_filename || "" },
      { type: "text", target: "TITLE", value: configData.title_line_1 || "" },
      { type: "text", target: "SUBTITLE", value: configData.subtitle || "" },
      { type: "text", target: "SITE_NAME", value: configData.site_name || "" },
      { type: "text", target: "PHOTOGRAPHER", value: configData.photographer || "" },
      { type: "text", target: "PLATFORM", value: (configData.platform || "INSPOWALL").toUpperCase() }
    ];
  }

  const format = configData.format || "webp";
  const quality = configData.quality || 85;

  const localAppUrl = await $env.get("LOCAL_APP_URL") || "http://127.0.0.1:5000";
  const encodedData = encodeURIComponent(JSON.stringify(ogData));
  const renderUrl = `${localAppUrl.replace(/\/$/, '')}/api/v1/storage/files/opengraph?template=${configData.template_id || "default-opengraph"}&data=${encodedData}&format=${format}&quality=${quality}`;

  const res = await fetch(renderUrl);
  if (!res.ok) {
    const errText = await res.text();
    return new Response(`Internal Rendering Error: ${errText}`, {
      status: 502,
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  }

  const ab = await res.arrayBuffer();
  const isCacheable = ab.byteLength >= 2048;

  if (isCacheable) {
    await cacheOgImage(hash, ab);
  }

  return new Response(ab, {
    status: 200,
    headers: {
      "Content-Type": res.headers.get("content-type") || "image/webp",
      "Cache-Control": isCacheable ? "public, max-age=31536000, immutable" : "no-store, max-age=0"
    }
  });
});

// ==========================================
// 3. GET TEMPLATES (GET /templates)
// ==========================================
app.get("/templates", async (c) => {
  const authHeader = c.req.header("Authorization") || "";
  let userId = null;

  try {
    let decodedId = c.req.raw.auth?.id;
    if (!decodedId && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      let b64 = token.split(".")[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const decoded = JSON.parse($util.base64Decode(b64));
      decodedId = Number(decoded.uid);
    }
    userId = decodedId;
  } catch (e) {}

  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const templatesQuery = await $db.records.list("og_templates", { filter: JSON.stringify({ user_id: userId }) });
  const templates = (templatesQuery?.items || []).map(item => item.data || item);

  return c.json({ success: true, templates });
});

// ==========================================
// 4. POST UPLOAD TEMPLATES (POST /templates)
// ==========================================
app.post("/templates", async (c) => {
  const authHeader = c.req.header("Authorization") || "";
  let userId = null;
  let clientName = "client";

  try {
    let decodedId = c.req.raw.auth?.id;
    if (!decodedId && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      let b64 = token.split(".")[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const decoded = JSON.parse($util.base64Decode(b64));
      decodedId = Number(decoded.uid);
    }
    if (decodedId) {
      userId = decodedId;
      const keyQuery = await $db.records.list("og_api_keys", { filter: JSON.stringify({ user_id: userId, active: true }) });
      if (keyQuery?.items?.length > 0) {
        clientName = keyQuery.items[0].data?.client_name || "client";
      } else {
        return c.json({ error: "Create an API Key to upload templates." }, 403);
      }
    }
  } catch (e) {}

  if (!userId) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json();
  const { slug, name, svg } = body;
  if (!slug || !svg) return c.json({ error: "Missing 'slug' or 'svg'" }, 400);

  const finalSlug = `${$util.slugify(clientName)}-${$util.slugify(slug)}`;

  const existing = await $db.records.list("og_templates", { filter: JSON.stringify({ slug: finalSlug }) });
  let existingId = null;

  if (existing?.items?.length > 0) {
    const tmpl = existing.items[0].data || existing.items[0];
    if (tmpl.user_id !== userId) return c.json({ error: "Slug in use by another account" }, 403);
    existingId = existing.items[0].id;
  }

  const adminKey = await $env.get("INTERNAL_ADMIN_KEY");
  const localBaseUrl = await $env.get("LOCAL_BASE_URL");

  const res = await fetch(`${localBaseUrl}/api/v1/admin/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": adminKey },
    body: JSON.stringify({ slug: finalSlug, content: svg })
  });

  if (!res.ok) return c.json({ error: "System registry failed", details: await res.text() }, 502);

  const tmplData = { slug: finalSlug, name: name || slug, user_id: userId };
  if (existingId) {
    await $db.records.update("og_templates", existingId, tmplData);
  } else {
    await $db.records.create("og_templates", tmplData);
  }

  return c.json({ success: true, templateId: finalSlug });
});

export default async function (req) {
  return app.fetch(req);
}