
ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS header_bg_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS header_text_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS header_visible_socials jsonb DEFAULT NULL;
