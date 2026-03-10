
## Translate All Portuguese Strings to English

### What's wrong
There are Portuguese strings scattered across 4 files. Here's a full inventory:

**`src/pages/dashboard/GalleryDetail.tsx`** (most critical — user is viewing this now)
- Line 1351: `Deletar foto?` → `Delete photo?`
- Line 1353: `Esta ação não pode ser desfeita. A foto será removida permanentemente da galeria.` → `This action cannot be undone. The photo will be permanently removed from the gallery.`
- Line 1357: `Cancelar` → `Cancel`
- Line 1367: `Deletar` → `Delete`
- Line 887: `alt="Capa"` → `alt="Cover"`

**`src/pages/dashboard/Bookings.tsx`**
- Line 188: `Agenda` (breadcrumb label) → `Schedule`

**`src/pages/dashboard/SessionForm.tsx`**
- Line 887: `alt="Capa"` → `alt="Cover"`

### Files to change
1. `src/pages/dashboard/GalleryDetail.tsx` — delete photo dialog (4 strings) + cover alt
2. `src/pages/dashboard/Bookings.tsx` — "Agenda" breadcrumb label
3. `src/pages/dashboard/SessionForm.tsx` — cover image alt text

### Non-issues
- `saving…` / `Saving…` — already English (uppercase "S" in one place is fine)
- All other files checked are in English
- `CreateGalleryDialog`, `WatermarkEditor`, `Sessions`, `Settings` — all clean
