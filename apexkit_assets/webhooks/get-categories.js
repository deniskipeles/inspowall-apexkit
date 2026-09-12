/** @type {import("../apexkit").FileMetadata} */
export const __fileMetadata__ = {
  "id": 3,
  "name": "get-categories",
  "extension": "js",
  "target_collection": null,
  "type": "webhook",
  "path": "./webhooks/",
  "trigger_type": "manual",
  "active": true,
  "visibility": "private"
};

export const graphql = {
    parent: "Query",
    name: "getDistinctCategories",
    args: {},
    returnType: "[String!]"
};

export default async function(req) {
    try {
        // Execute a native SQL group-by query via the Query Engine
        const results = await $db.query({
            from: "pins",
            select: [
                {
                    field: "category",
                    as: "category"
                }
            ],
            group_by: ["category"]
        });

        // Map database result rows to a clean, flat array of unique strings
        const categories = results
            .map(row => row.category)
            .filter(Boolean);

        return new Response(categories);
    } catch (e) {
        return new Response({ error: e.toString() }, { status: 500 });
    }
}