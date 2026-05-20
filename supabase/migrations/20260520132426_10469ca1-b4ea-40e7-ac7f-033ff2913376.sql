ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS product_page_title text,
  ADD COLUMN IF NOT EXISTS product_page_in_menu boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS product_page_sort_order integer NOT NULL DEFAULT 99;