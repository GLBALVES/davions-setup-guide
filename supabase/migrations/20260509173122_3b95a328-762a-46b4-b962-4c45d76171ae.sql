ALTER TABLE public.photographer_site
ADD COLUMN IF NOT EXISTS custom_fonts jsonb NOT NULL DEFAULT '[]'::jsonb;