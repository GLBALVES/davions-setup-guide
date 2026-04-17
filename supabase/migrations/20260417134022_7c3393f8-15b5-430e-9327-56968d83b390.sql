ALTER TABLE public.site_pages
ADD COLUMN IF NOT EXISTS header_config jsonb;