-- Add portfolio_photos column to sessions table (array of up to 5 image URLs)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS portfolio_photos TEXT[] DEFAULT NULL;