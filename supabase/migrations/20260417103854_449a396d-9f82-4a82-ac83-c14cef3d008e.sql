ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS heading_font text,
  ADD COLUMN IF NOT EXISTS body_font text;