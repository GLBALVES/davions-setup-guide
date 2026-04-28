ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS animation_style TEXT NOT NULL DEFAULT 'none';