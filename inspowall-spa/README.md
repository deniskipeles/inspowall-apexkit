# Vortex - Required ApexKit Collections

This application uses [ApexKit](https://www.npmjs.com/package/@apexkit/sdk) for its backend.
Since the frontend currently relies on mock data generators (`generateMockPins`, etc.), you will need to manually create the following collections in your ApexKit admin dashboard to migrate away from mock data.

## 1. `users` (System Collection)
ApexKit usually comes with a built-in `users` collection. You should add the following custom fields to it:
- `name` (Type: Text)
- `handle` (Type: Text, unique)
- `avatar` (Type: File or Text URL)
- `followers_count` (Type: Number, Default: 0)
- `following_count` (Type: Number, Default: 0)

## 2. `pins` (Collection)
This collection stores the images (pins) that users upload and view on the feed.

**Fields:**
- `title` (Type: Text, Required)
- `description` (Type: Text)
- `image` (Type: File or Text URL, Required)
- `category` (Type: Text)
- `author_id` (Type: Relation to `users`, Required)
- `tags` (Type: JSON Array of Strings)
- `height` (Type: Number, optional - used for Masonry grid layout calculations)
- `likes_count` (Type: Number, Default: 0)

## 3. `saved_pins` (Collection)
This collection acts as a join table to track which users have saved which pins to their profile.

**Fields:**
- `user_id` (Type: Relation to `users`, Required)
- `pin_id` (Type: Relation to `pins`, Required)

---

### Integration Complete
The frontend is now fully integrated with the ApexKit SDK. All mock data generators have been removed.

#### Required Manual Setup
Before the app can display data, you **MUST** create the following collections in your ApexKit Admin Dashboard:

1.  **`users`** (System Collection): Ensure `name`, `handle`, and `avatar` fields exist if you want to display them.
2.  **`pins`**: Create this collection with fields `title`, `description`, `image` (Text URL or File), `category`, `author_id` (Relation to `users`), `height` (Number), `tags` (JSON), and `likes_count` (Number).
3.  **`saved_pins`**: Create this collection with fields `user_id` (Relation to `users`) and `pin_id` (Relation to `pins`).
4.  **`likes`**: Create this collection with fields `user_id` (Relation to `users`) and `pin_id` (Relation to `pins`).
    -   **Important Hook**: You should add a server-side hook (or trigger) that increments/decrements the `likes_count` field on the `pins` collection whenever a record is created or deleted in this collection.

Once created, you can seed these collections via the dashboard or using the `apex` client in a script.
