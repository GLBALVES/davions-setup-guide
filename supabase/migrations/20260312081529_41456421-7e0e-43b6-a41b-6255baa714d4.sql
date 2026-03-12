ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS stripe_secret_key text,
  ADD COLUMN IF NOT EXISTS stripe_publishable_key text;