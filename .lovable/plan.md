
## Plan: Fix Lightroom Export Modal

**Issues to fix:**
1. Modal description text is in Portuguese — change to English
2. Remove the two-button approach — replace with one "Copy" (comma-separated CSV, the Lightroom standard) and one "Download .txt" button
3. Button labels are in Portuguese — change to English

**Changes to `src/pages/dashboard/GalleryDetail.tsx` (lines ~1148–1179):**

- `DialogDescription`: Change to English, e.g. `"{X} photo(s) favorited by your client"`
- Remove `listText` variable (newline-separated) — only keep `csvText` (comma-separated)
- Replace the two copy buttons with:
  - **"Copy"** button → copies `csvText` (comma-separated, Lightroom standard)
  - **"Download .txt"** button → creates a Blob with `csvText` content and triggers a file download as `lightroom-favorites.txt`
- Button labels: `"Copied!"` instead of `"Copiado!"`, `"Copy"`, `"Download .txt"`

**No database or routing changes needed.**
