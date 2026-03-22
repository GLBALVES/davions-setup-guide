
## Feature: Auto-advance "shot" → "proof_gallery" when a proof gallery is linked

### How it works today

In `fetchProjects` (Projects.tsx lines 644–664), galleries are already fetched for each project via `booking_id`. The code builds `galleryCovers` (a `Record<booking_id → cover_image_url>`), but only uses it to show a thumbnail — it never checks whether a gallery exists to advance the stage.

### What needs to change

After the `galleryCovers` map is built (and before `setProjects`), add an auto-advance check:

> For every project in stage **"shot"** that has a `booking_id` and has a **proof** gallery linked (`category === "proof"`) → advance to `"proof_gallery"`.

Since the existing gallery fetch only selects `booking_id` and `cover_image_url`, it needs to also select `category` and `status` (only published/draft galleries count — not expired ones).

### Changes in `Projects.tsx`

**Step 1 — Expand the gallery query** (line 652–656) to include `category` and `status`:
```ts
const { data: galleries } = await supabase
  .from("galleries")
  .select("booking_id, cover_image_url, category, status")
  .in("booking_id", bookingIds)
  .neq("status", "expired"); // ignore expired galleries
```

**Step 2 — Build a secondary map** of `booking_id → hasProofGallery`:
```ts
const proofGalleryBookings = new Set<string>();
for (const g of galleries as any[]) {
  if (g.booking_id && g.category === "proof") {
    proofGalleryBookings.add(g.booking_id);
  }
}
```

**Step 3 — Auto-advance "shot" → "proof_gallery"** after the `toAdvance` (shot) block:
```ts
const toProofGallery: string[] = [];
for (const p of mapped) {
  if (p.stage !== "shot") continue;
  if (p.booking_id && proofGalleryBookings.has(p.booking_id)) {
    toProofGallery.push(p.id);
  }
}

if (toProofGallery.length > 0) {
  await supabase
    .from("client_projects" as any)
    .update({ stage: "proof_gallery" } as any)
    .in("id", toProofGallery);
  for (const p of mapped) {
    if (toProofGallery.includes(p.id)) p.stage = "proof_gallery";
  }
}
```

**Note on ordering**: the `toAdvance` (upcoming→shot) block runs first, so a project that just got moved to "shot" in the same load won't be immediately moved again — it will only advance to "proof_gallery" on the next `fetchProjects` call (page reload or next visit), which is the correct and safe behavior.

### Result
- A project in "Fotografadas" with a linked proof gallery → automatically moves to "Galeria de provas" on next page load ✓
- Projects without a linked gallery stay in "Fotografadas" ✓
- Manually created projects (no `booking_id`) are unaffected ✓
- Expired galleries don't trigger the transition ✓

**File to edit:** only `src/pages/dashboard/Projects.tsx` — 3 small additions
