/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 40,
  "name": "media-helper",
  "extension": "js",
  "target_collection": null,
  "type": "custom:module",
  "path": "./modules/custom/",
  "trigger_type": "manually",
  "active": true,
  "visibility": "private"
};

/** @type {import("../../apexkit").FileMetadata} */


const VFS_MEDIA_DIR = "processed_media";

function inspectMagicBytes(bytes) {
  if (!bytes || bytes.length < 12) return { valid: false, mime: "application/octet-stream" };

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { valid: true, mime: "image/jpeg" };
  }
  // PNG
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { valid: true, mime: "image/png" };
  }
  // WebP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { valid: true, mime: "image/webp" };
  }
  // GIF
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { valid: true, mime: "image/gif" };
  }

  return { valid: false, mime: "application/octet-stream" };
}

/**
 * Checks and reads an image from $fs VFS, automatically purging corrupted files
 */
export async function getCachedMedia(cacheKey) {
  const vfsPath = `${VFS_MEDIA_DIR}/${cacheKey}`;
  if (typeof $fs?.exists === "function" && (await $fs.exists(vfsPath))) {
    const b64 =
      typeof $fs.readBytes === "function"
        ? await $fs.readBytes(vfsPath)
        : await $fs.read(vfsPath);

    if (b64) {
      const buffer = $util.base64DecodeBuffer(b64);
      const uint8 = new Uint8Array(buffer);
      const check = inspectMagicBytes(uint8);

      // If magic bytes are valid, return the clean buffer
      if (check.valid && buffer.byteLength >= 2048) {
        return { buffer, mimeType: check.mime };
      } else {
        // Auto-purge corrupted cache file
        console.warn(`[VFS Cache] Purging corrupted or incomplete file: ${cacheKey}`);
        if (typeof $fs?.delete === "function") {
          await $fs.delete(vfsPath);
        }
      }
    }
  }
  return null;
}

/**
 * Saves processed image bytes to $fs VFS only if valid
 */
export async function saveCachedMedia(cacheKey, arrayBuffer) {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const check = inspectMagicBytes(uint8);

    if (!check.valid || arrayBuffer.byteLength < 2048) {
      console.warn(`[VFS Cache] Skipping save for invalid or small binary: ${cacheKey}`);
      return;
    }

    if (typeof $fs?.mkdir === "function") await $fs.mkdir(VFS_MEDIA_DIR);
    const vfsPath = `${VFS_MEDIA_DIR}/${cacheKey}`;

    if (typeof $fs?.writeBytes === "function") {
      await $fs.writeBytes(vfsPath, arrayBuffer);
    } else if (typeof $fs?.write === "function") {
      const b64 = $util.base64EncodeBuffer(arrayBuffer);
      await $fs.write(vfsPath, b64);
    }
  } catch (e) {
    console.warn(`[VFS Cache] Failed to save ${cacheKey}:`, e.message);
  }
}

/**
 * Resolves, transforms via Native Backend Engine to WebP, and caches into $fs VFS
 */
export async function processAndCacheImage(storageFilename, options = {}) {
  const thumb = options.thumb || "";
  const quality = options.quality || "80";
  const format = (options.format || "webp").toLowerCase();
  const blur = options.blur || "";

  const safeFilename = storageFilename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const cacheKey = `opt_${safeFilename}_t${thumb || "orig"}_q${quality}_b${blur || "0"}.${format}`;

  // 1. Check VFS Cache (with automatic corruption purge)
  const cached = await getCachedMedia(cacheKey);
  if (cached) {
    return {
      buffer: cached.buffer,
      mimeType: cached.mimeType,
      hit: true,
    };
  }

  // 2. Cache Miss: Transform directly via native backend image engine (forcing WebP)
  const localAppUrl = (await $env.get("LOCAL_APP_URL")) || "http://127.0.0.1:5000";
  const cleanBase = localAppUrl.replace(/\/$/, "");

  const qs = new URLSearchParams();
  if (thumb && thumb !== "orig") qs.set("thumb", thumb);
  qs.set("format", format);
  qs.set("quality", quality);
  if (blur) qs.set("blur", blur);

  const nativeUrl = `${cleanBase}/api/v1/storage/file/${encodeURIComponent(storageFilename)}?${qs.toString()}`;

  const res = await fetch(nativeUrl);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Native transform failed [${res.status}]: ${errText || res.statusText}`);
  }

  const ab = await res.arrayBuffer();
  const check = inspectMagicBytes(new Uint8Array(ab));

  if (!check.valid) {
    throw new Error("Native engine returned invalid image magic bytes");
  }

  // 3. Cache the verified binary in $fs for future requests
  await saveCachedMedia(cacheKey, ab);

  return {
    buffer: ab,
    mimeType: check.mime,
    hit: false,
  };
}