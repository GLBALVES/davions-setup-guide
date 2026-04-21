ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS logo_text text,
  ADD COLUMN IF NOT EXISTS logo_size text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS hide_branding boolean NOT NULL DEFAULT false;