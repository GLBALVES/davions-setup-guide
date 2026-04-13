

## Bug Fix: Website Settings fields clearing on save

### Root Cause
Two issues combine to cause the bug:

1. **useEffect depends on `[user]` (object reference)** — line 771. Supabase token refresh creates a new `user` object in AuthContext (even for `TOKEN_REFRESHED` events), which re-triggers the data fetch effect. This re-fetch overwrites the form state with old/null DB values during or right after save.

2. **`photographers.update()` error is not checked** — line 808. The update for `full_name` and `bio` doesn't capture the error result. If it fails (e.g., RLS), the success toast from `photographer_site` upsert still shows, but the profile data was never saved.

### Fix

**File: `src/pages/dashboard/WebsiteSettings.tsx`**

1. **Change useEffect dependency** from `[user]` to `[user?.id]` (stable string). This prevents re-fetching on token refresh while still re-fetching on actual login/logout.

2. **Capture and handle the photographers update error** in `handleSave`. If either the `photographers` update or the `photographer_site` upsert fails, show the error. Only show success if both succeed.

### Changes
- `src/pages/dashboard/WebsiteSettings.tsx` — two edits (dependency array + error handling in handleSave)

