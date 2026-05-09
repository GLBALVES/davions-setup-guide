ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS is_site_gallery boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS galleries_one_site_gallery_per_photographer
  ON public.galleries (photographer_id) WHERE is_site_gallery = true;