
-- Add new content fields to photographer_site
ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS quote_text text,
  ADD COLUMN IF NOT EXISTS quote_author text,
  ADD COLUMN IF NOT EXISTS experience_title text,
  ADD COLUMN IF NOT EXISTS experience_text text;

-- Add tagline to sessions table
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS tagline text;
