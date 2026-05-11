ALTER TABLE public.photographer_site
ADD COLUMN IF NOT EXISTS site_colors JSONB NOT NULL DEFAULT '[]'::jsonb;