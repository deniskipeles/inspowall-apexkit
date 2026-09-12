/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 41,
  "name": "og-helper",
  "extension": "js",
  "target_collection": null,
  "type": "custom:module",
  "path": "./modules/custom/",
  "trigger_type": "manually",
  "active": true,
  "visibility": "private"
};

/** @type {import("../apexkit").FileMetadata} */


/** @type {import("../../apexkit").FileMetadata} */


const VFS_CACHE_DIR = "processed_media";

export async function getCachedOgImage(hash) {
  const vfsCachedPath = `${VFS_CACHE_DIR}/og_${hash}.webp`;
  if (typeof $fs?.exists === 'function' && await $fs.exists(vfsCachedPath)) {
    const b64 = typeof $fs.readBytes === 'function' ? await $fs.readBytes(vfsCachedPath) : await $fs.read(vfsCachedPath);
    return $util.base64DecodeBuffer(b64);
  }
  return null;
}

export async function cacheOgImage(hash, arrayBuffer) {
  try {
    if (typeof $fs?.mkdir === 'function') await $fs.mkdir(VFS_CACHE_DIR);
    const vfsCachedPath = `${VFS_CACHE_DIR}/og_${hash}.webp`;
    const b64 = $util.base64EncodeBuffer(arrayBuffer);
    
    if (typeof $fs?.writeBytes === 'function') {
      await $fs.writeBytes(vfsCachedPath, b64);
    } else if (typeof $fs?.write === 'function') {
      await $fs.write(vfsCachedPath, b64);
    }
  } catch (e) {
    console.warn(`[VFS Cache Warning] Could not cache OG image ${hash}:`, e);
  }
}

export async function processDataPayload(data) {
  let processedData = [];

  for (const item of data) {
    if (item.type === "image") {
      let savedFilename = item.value;
      const platform = String(item.platform || "inspowall").toLowerCase().trim();
      const imageId = item.value;

      const isDirectInspoWall = platform === "inspowall" || imageId.startsWith("data:") || imageId.includes("storage/file");
      const isAlreadyFilename = isDirectInspoWall || (imageId.includes(".") && !imageId.startsWith("http"));

      if (!isAlreadyFilename) {
        const numericId = Number(imageId);
        let existingPin = null;

        try {
          const query = await $db.records.list("pins", {
            filter: JSON.stringify({
              $or: [{ "metadata.id": imageId }, { "metadata.id": isNaN(numericId) ? imageId : numericId }, { "image": imageId }]
            })
          });
          if (query?.items?.length > 0) existingPin = query.items[0].data || query.items[0];
        } catch (e) { }

        if (existingPin) {
          savedFilename = existingPin.image;
        } else {
          let rawImageUrl = "";
          let photoMetadata = null;

          try {
            if (platform === "unsplash") {
              const key = await $env.get("UNSPLASH_ACCESS_KEY");
              const res = await fetch(`https://api.unsplash.com/photos/${imageId}`, { headers: { Authorization: `Client-ID ${key}` } });
              const meta = await res.json();
              rawImageUrl = meta.urls?.regular || meta.urls?.small;
              photoMetadata = meta;
            } else if (platform === "pexels") {
              const key = await $env.get("PEXELS_API_KEY");
              const res = await fetch(`https://api.pexels.com/v1/photos/${imageId}`, { headers: { Authorization: key } });
              const meta = await res.json();
              rawImageUrl = meta.src?.large2x || meta.src?.original;
              photoMetadata = meta;
            } else {
              rawImageUrl = imageId;
            }
          } catch (e) { rawImageUrl = imageId; }

          if (!rawImageUrl) throw new Error(`Failed to resolve image ID '${imageId}'`);

          try {
            const imgRes = await fetch(rawImageUrl);
            const ab = await imgRes.arrayBuffer();
            const b64Data = $util.base64EncodeBuffer(ab);
            const ext = platform === "unsplash" ? "jpg" : "jpeg";
            const fileResult = await $files.save(`og_${platform}_${imageId}.${ext}`, b64Data, "image/jpeg");
            savedFilename = fileResult.filename;
          } catch (e) {
            throw new Error("Storage error: " + e.toString());
          }

          if (photoMetadata && (platform === "unsplash" || platform === "pexels")) {
            try {
              const pinTitle = photoMetadata.alt_description || photoMetadata.description || photoMetadata.alt || "Untitled";
              const pinDesc = photoMetadata.description || photoMetadata.alt || `Photography on ${platform}.`;
              const origWidth = photoMetadata.width || 1000;
              const origHeight = photoMetadata.height || 1500;
              const masonryHeight = Math.min(Math.max((origHeight / origWidth) * 300, 200), 500);

              await $db.records.create("pins", {
                title: pinTitle.substring(0, 50).replace(/\b\w/g, c => c.toUpperCase()),
                description: pinDesc,
                category: platform.toLowerCase(),
                tags: [platform, "opengraph"],
                image: savedFilename,
                height: Math.round(masonryHeight),
                likes_count: photoMetadata.likes || 0,
                metadata: photoMetadata
              });
            } catch (e) { }
          }
        }
      }

      processedData.push({
        type: "image",
        target: item.target,
        value: savedFilename,
        params: item.params || {}
      });

    } else {
      processedData.push(item);
    }
  }

  return processedData;
}