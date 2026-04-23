ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS shop_title text,
  ADD COLUMN IF NOT EXISTS shop_description text,
  ADD COLUMN IF NOT EXISTS shop_show_sessions boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_show_galleries boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_layout text NOT NULL DEFAULT 'grid-3';