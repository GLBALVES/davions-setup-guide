
## Analysis

### add-photo (Prompt 1)
The current code already returns `{ photo_id: data.id }` correctly on line 163, and the deduplication path also returns `{ photo_id: existing.id }` on line 133. The structure is already correct.

**The issue**: The `console.log` on line 159 only logs the UUID but does NOT log the final response body explicitly. The user wants a `console.log('Returning:', JSON.stringify(responseBody))` right before the final return so the logs confirm exactly what is being sent back. Also, the response on line 164 doesn't explicitly set `status: 200` (though that's the default, it's better to be explicit for debugging). And there's no `Content-Type` on the duplicate path's response — wait, line 134 does have it.

Actually looking more carefully, the function looks correct structurally. But to satisfy the user's requirement exactly:
1. Add explicit `console.log('Returning:', JSON.stringify(responseBody))` before the final new insert response
2. Add the same log on the duplicate path
3. Make the response explicit with `status: 200`

### delete-photo (Prompt 2)
The current delete-photo has a critical issue: it uses `auth.getClaims()` which is a Supabase v1 API — in v2 it should be `getUser()`. The `getAuthenticatedClient` function uses `supabase.auth.getClaims(token)` which doesn't exist in v2, causing the auth check to always fail and return `null`, making every delete request return 401.

Additionally:
- The delete function reads the body twice (once in `getAuthenticatedClient` via `req.clone().json()` and once via `req.json()` on line 52) — but since `req.clone()` is used in the helper, the second `req.json()` call should still work.
- Missing `console.log` at each step for diagnostics.
- The storage bucket name is correct (`gallery-photos`).
- The DB delete uses `auth.supabase` which may not have the right permissions if auth failed.

**Main fixes needed for delete-photo:**
1. Replace `getClaims` with `getUser` in the auth helper
2. Use service role client for both storage and DB delete (to avoid permission issues with the photographer_id fallback path)
3. Add comprehensive `console.log` at every step as the user requested

## Plan

### File changes

**`supabase/functions/add-photo/index.ts`**
- Add explicit `console.log('Returning:', JSON.stringify(responseBody))` before the final insert response (and the duplicate path response)
- Make it crystal clear with an explicit `responseBody` variable + `status: 200`
- Add the same logging to the deduplication early-return path

**`supabase/functions/delete-photo/index.ts`**
- Rewrite the `getAuthenticatedClient` helper: replace `getClaims` with `getUser` (v2 API)
- Add step-by-step `console.log` as the user specified: on entry, after photo fetch, after storage delete, after DB delete
- Use service role client for the actual storage + DB deletion to avoid RLS issues when using the photographer_id fallback path
- Return `{ deleted: photo_id }` on success (as user specified)
- Fix: the body is consumed twice — need to read it once, pass the photo_id and photographer_id as parameters

### Implementation approach
The delete-photo rewrite needs special care because `req.body` can only be consumed once. The fix is:
1. Parse body once at the top of the handler
2. Pass `photographer_id` explicitly from the parsed body to the auth check
3. Use service role for deletes to bypass RLS entirely (the auth is just to verify the caller is a valid photographer, not for RLS)
