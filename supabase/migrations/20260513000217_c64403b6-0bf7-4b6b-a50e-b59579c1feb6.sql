-- Photographers: Pagar.me recipient
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS pagarme_recipient_id text,
  ADD COLUMN IF NOT EXISTS pagarme_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS pagarme_kyc_status text;

-- Bookings: provider routing
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS pagarme_order_id text,
  ADD COLUMN IF NOT EXISTS pagarme_charge_id text;

-- Galleries: provider routing
ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe';

-- App-wide payment settings (single row managed by admins)
CREATE TABLE IF NOT EXISTS public.app_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_master_recipient_id text,
  davions_commission_percent numeric(5,2) NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE POLICY "Admins can view payment settings"
      ON public.app_payment_settings
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Admins can insert payment settings"
      ON public.app_payment_settings
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Admins can update payment settings"
      ON public.app_payment_settings
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Updated_at trigger
DROP TRIGGER IF EXISTS app_payment_settings_set_updated_at ON public.app_payment_settings;
CREATE TRIGGER app_payment_settings_set_updated_at
  BEFORE UPDATE ON public.app_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row if none exists
INSERT INTO public.app_payment_settings (davions_commission_percent)
SELECT 5
WHERE NOT EXISTS (SELECT 1 FROM public.app_payment_settings);