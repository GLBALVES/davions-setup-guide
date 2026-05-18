ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS site_language text;

ALTER TABLE public.photographer_site
  DROP CONSTRAINT IF EXISTS photographer_site_site_language_check;

ALTER TABLE public.photographer_site
  ADD CONSTRAINT photographer_site_site_language_check
  CHECK (site_language IS NULL OR site_language IN ('en','pt','es'));