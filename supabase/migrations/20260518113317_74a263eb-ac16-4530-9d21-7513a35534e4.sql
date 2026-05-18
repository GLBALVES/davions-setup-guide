ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS shop_header_config jsonb,
  ADD COLUMN IF NOT EXISTS shop_blocks_above jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shop_blocks_below jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shop_show_default_grid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_manual_sessions uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS shop_manual_galleries uuid[] NOT NULL DEFAULT '{}'::uuid[];