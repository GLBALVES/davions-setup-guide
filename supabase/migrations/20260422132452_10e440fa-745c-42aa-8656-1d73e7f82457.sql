-- Add published_header_config so the Publish action can snapshot the header
-- separately from the live draft, matching how published_content works.
ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS published_header_config jsonb;

-- Backfill: copy the current header_config into the published snapshot for
-- any page that has already been published at least once. New publishes will
-- overwrite this from the editor.
UPDATE public.site_pages
SET published_header_config = header_config
WHERE published_at IS NOT NULL
  AND published_header_config IS NULL
  AND header_config IS NOT NULL;