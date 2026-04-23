ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS terms_content text,
  ADD COLUMN IF NOT EXISTS privacy_content text;