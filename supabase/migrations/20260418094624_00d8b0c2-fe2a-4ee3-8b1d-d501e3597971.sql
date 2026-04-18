ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS published_content jsonb,
  ADD COLUMN IF NOT EXISTS published_sections_order jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamp with time zone;

-- Backfill: treat all existing pages as already published with their current content
UPDATE public.site_pages
SET published_content = page_content,
    published_sections_order = sections_order,
    published_at = now()
WHERE published_content IS NULL;