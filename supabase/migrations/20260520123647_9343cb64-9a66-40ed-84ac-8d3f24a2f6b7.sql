ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS product_page_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_page_header_config jsonb,
  ADD COLUMN IF NOT EXISTS published_product_page_sections jsonb,
  ADD COLUMN IF NOT EXISTS published_product_page_header_config jsonb;