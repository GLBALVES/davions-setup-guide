ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS business_neighborhood text DEFAULT NULL;
ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS business_state text DEFAULT NULL;
ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS business_zip text DEFAULT NULL;