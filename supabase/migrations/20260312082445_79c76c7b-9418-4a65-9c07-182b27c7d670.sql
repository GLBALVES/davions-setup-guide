-- Add Stripe Connect fields, remove manual key columns
ALTER TABLE public.photographers
  DROP COLUMN IF EXISTS stripe_secret_key,
  DROP COLUMN IF EXISTS stripe_publishable_key,
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_connected_at timestamp with time zone;