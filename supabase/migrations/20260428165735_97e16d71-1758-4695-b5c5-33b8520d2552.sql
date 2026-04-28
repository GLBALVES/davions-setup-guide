ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS font_template_id text,
  ADD COLUMN IF NOT EXISTS font_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;