ALTER TABLE public.photographer_site
ADD COLUMN IF NOT EXISTS external_font_families JSONB NOT NULL DEFAULT '[]'::jsonb;