ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS blog_in_menu boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blog_sort_order integer NOT NULL DEFAULT 2;