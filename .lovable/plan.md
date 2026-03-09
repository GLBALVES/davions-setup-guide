
## Thinking Through the Architecture

### What the Lightroom plugin needs
The plugin is a desktop application running inside Adobe Lightroom Classic. It needs to communicate with a server API to:

1. **`davions_connect`** — Authenticate a photographer (login). Receives `photographer_id` + `email` back.
2. **`create_gallery`** — Create a new gallery record. Receives back a `unique_id`.
3. **`add_photo`** — Upload/register a photo inside a gallery. Receives back a `photo_id`.
4. **`update_gallery`** — Update gallery metadata (title, settings, etc). Returns `{ status: "success" }`.
5. **`delete_photo`** — Delete a photo from a gallery. Returns `{ status: "success" }`.
6. **`delete_gallery`** — Delete an entire gallery. Returns `{ status: "success" }`.

### Implementation approach: Edge Functions

Each endpoint becomes a **Supabase Edge Function** (serverless, HTTPS, globally available). The plugin calls them over HTTPS with JSON bodies.

The `davions_connect` endpoint uses the Supabase `signInWithPassword` flow (or service role to verify credentials), then returns the `photographer_id` and `email`. Subsequent calls pass a JWT token in the `Authorization: Bearer <token>` header.

### Database schema required

We need to create the tables the edge functions will read/write. No tables exist yet.

**`photographers`** (profiles table keyed off `auth.users`):
```
id          uuid (= auth.uid())
email       text
full_name   text
created_at  timestamptz
```

**`galleries`**:
```
id              uuid PK
photographer_id uuid → photographers.id
title           text
slug            text UNIQUE
access_code     text (hashed)
status          text ('draft'|'published')
created_at      timestamptz
updated_at      timestamptz
```

**`photos`**:
```
id              uuid PK
gallery_id      uuid → galleries.id
photographer_id uuid → photographers.id
filename        text
storage_path    text
order_index     int
created_at      timestamptz
```

### Authentication flow for the plugin

The Lightroom plugin calls `davions_connect` with `{ email, password }`.  
The edge function calls `supabase.auth.signInWithPassword()` using the SERVICE ROLE client (which can sign in on behalf of users), then returns the `photographer_id` and `email` + a session token.  
All subsequent calls include `Authorization: Bearer <access_token>`.

Actually, a cleaner approach: the edge function uses the **anon client** to call `signInWithPassword` (standard auth), returns the session's access_token to the plugin. The plugin stores this token and sends it as a Bearer token in all subsequent requests. The other edge functions validate the JWT to get the photographer_id.

### Edge Functions plan

**`supabase/functions/davions-connect/index.ts`**
- POST `{ email, password }`
- Signs in via `supabase.auth.signInWithPassword()`
- Queries `photographers` table for the profile
- Returns `{ status: "success", response: { photographer_id, email }, token: access_token }`

**`supabase/functions/create-gallery/index.ts`**
- POST `{ title, slug?, access_code? }` + Bearer token
- Validates JWT → gets photographer_id
- Inserts into `galleries`
- Returns `{ status: "success", response: { unique_id } }`

**`supabase/functions/add-photo/index.ts`**
- POST `{ gallery_id, filename, storage_path?, order_index? }` + Bearer token
- Validates JWT → gets photographer_id
- Inserts into `photos`
- Returns `{ status: "success", response: { photo_id } }`

**`supabase/functions/update-gallery/index.ts`**
- POST `{ gallery_id, title?, access_code?, status? }` + Bearer token
- Validates JWT, checks ownership
- Updates `galleries`
- Returns `{ status: "success" }`

**`supabase/functions/delete-photo/index.ts`**
- POST `{ photo_id }` + Bearer token
- Validates JWT, checks ownership
- Deletes from `photos`
- Returns `{ status: "success" }`

**`supabase/functions/delete-gallery/index.ts`**
- POST `{ gallery_id }` + Bearer token
- Validates JWT, checks ownership
- Deletes from `galleries` (cascades to photos)
- Returns `{ status: "success" }`

### Security
- All endpoints except `davions_connect` validate the JWT and scope operations to `photographer_id = auth.uid()`.
- RLS policies on `galleries` and `photos` restrict access to the owning photographer.
- `davions_connect` uses `verify_jwt = false` (handles auth internally).

### config.toml additions
Each function needs a `[functions.name]` entry.

### Files to create/modify

**New migration**: `profiles`, `galleries`, `photos` tables + RLS policies + trigger to auto-create photographer profile on signup.

**New edge functions**:
- `supabase/functions/davions-connect/index.ts`
- `supabase/functions/create-gallery/index.ts`
- `supabase/functions/add-photo/index.ts`
- `supabase/functions/update-gallery/index.ts`
- `supabase/functions/delete-photo/index.ts`
- `supabase/functions/delete-gallery/index.ts`

**Modified**:
- `supabase/config.toml` — add `[functions.*]` entries with `verify_jwt = false` (we validate manually inside each function)

## Presenting the plan

This is clear enough to present. The plan is concrete and actionable.
