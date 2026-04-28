ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS color_palette_id TEXT,
  ADD COLUMN IF NOT EXISTS color_scheme_id TEXT,
  ADD COLUMN IF NOT EXISTS color_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_color_palettes JSONB NOT NULL DEFAULT '[]'::jsonb;