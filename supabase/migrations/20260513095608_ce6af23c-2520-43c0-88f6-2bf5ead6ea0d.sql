ALTER TABLE public.app_payment_settings
  ADD COLUMN IF NOT EXISTS charge_processing_fee boolean NOT NULL DEFAULT true;