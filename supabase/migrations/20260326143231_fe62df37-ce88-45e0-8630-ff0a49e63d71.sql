ALTER TABLE public.session_availability ADD COLUMN IF NOT EXISTS spots INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.session_availability ADD COLUMN IF NOT EXISTS location_override TEXT;