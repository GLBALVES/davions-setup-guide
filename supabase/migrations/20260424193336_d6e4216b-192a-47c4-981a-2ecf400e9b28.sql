ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS shop_in_menu boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_sort_order integer NOT NULL DEFAULT 1;