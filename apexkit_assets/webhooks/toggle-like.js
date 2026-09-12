/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 1,
  "name": "toggle-like",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

export default async function(req) {
    const data = await req.json();
    const pinId = data.pinId+"";
    
    if (!pinId) {
        return new Response(JSON.stringify({ error: "Missing pinId" }), { status: 400 });
    }

    // Extract User ID from the JWT Authorization token
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    
    const token = authHeader.split(" ")[1];
    let userId;
    try {
        const payloadSegment = token.split(".")[1];
        const decodedPayload = JSON.parse($util.base64Decode(payloadSegment));
        userId = Number(decodedPayload.uid);
    } catch (e) {
        return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401 });
    }

    if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    // Fetch the pin record first to resolve baseline likes from metadata
    let baselineLikes = 0;
    try {
        const pin = await $db.records.get("pins", pinId);
        if (pin && pin.data && pin.data.metadata && typeof pin.data.metadata.likes === 'number') {
            baselineLikes = pin.data.metadata.likes;
        }
    } catch (e) {
        console.log("Could not retrieve pin baseline likes: " + e.message);
    }

    // 1. Check if the like already exists using $db.records directly
    const existingLikes = await $db.records.list("likes", {
        filter: JSON.stringify({
            user_id: userId,
            pin_id: pinId
        })
    });

    let liked = false;
    if (existingLikes && existingLikes.items && existingLikes.items.length > 0) {
        // Already liked -> Remove the like record
        const likeId = existingLikes.items[0].id;
        await $db.records.delete("likes", likeId);
    } else {
        // Not liked yet -> Register a new like record
        await $db.records.create("likes", {
            user_id: userId,
            pin_id: pinId
        });
        liked = true;
    }

    // 2. Count the current total likes for this pin
    const totalLikes = await $db.records.list("likes", {
        filter: JSON.stringify({
            pin_id: pinId
        }),
        limit: 1 // Only need the total metadata attribute to find total count
    });

    const liveLikes = totalLikes.total || 0;

    // Sum the dynamic live likes with the static metadata baseline
    const likesCount = liveLikes + baselineLikes;

    // 3. Save the aggregated total in the likes_count field of the pin record
    await $db.records.update("pins", pinId, {
        likes_count: likesCount
    });

    return new Response({ liked, likesCount, pinId });
}