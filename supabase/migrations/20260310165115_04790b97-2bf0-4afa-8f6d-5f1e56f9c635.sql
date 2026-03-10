ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS business_city text,
  ADD COLUMN IF NOT EXISTS business_country text,
  ADD COLUMN IF NOT EXISTS business_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS business_tax_id text;