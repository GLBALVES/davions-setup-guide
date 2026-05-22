
-- 1. Create private table
CREATE TABLE IF NOT EXISTS public.photographers_private (
  photographer_id uuid PRIMARY KEY REFERENCES public.photographers(id) ON DELETE CASCADE,
  stripe_account_id text,
  stripe_connected_at timestamptz,
  pagarme_recipient_id text,
  pagarme_kyc_status text,
  business_tax_id text,
  business_tax_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.photographers_private ENABLE ROW LEVEL SECURITY;

-- 3. Policies: owner + admin only
CREATE POLICY "Owners read own private"
  ON public.photographers_private FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners insert own private"
  ON public.photographers_private FOR INSERT
  TO authenticated
  WITH CHECK (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners update own private"
  ON public.photographers_private FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners delete own private"
  ON public.photographers_private FOR DELETE
  TO authenticated
  USING (photographer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 4. Backfill from existing photographers rows
INSERT INTO public.photographers_private (
  photographer_id, stripe_account_id, stripe_connected_at,
  pagarme_recipient_id, pagarme_kyc_status, business_tax_id, business_tax_name
)
SELECT id, stripe_account_id, stripe_connected_at,
       pagarme_recipient_id, pagarme_kyc_status, business_tax_id, business_tax_name
FROM public.photographers
ON CONFLICT (photographer_id) DO NOTHING;

-- 5. Trigger to auto-create private row when a photographer is created
CREATE OR REPLACE FUNCTION public.ensure_photographer_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.photographers_private (photographer_id)
  VALUES (NEW.id)
  ON CONFLICT (photographer_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_photographer_private ON public.photographers;
CREATE TRIGGER trg_ensure_photographer_private
AFTER INSERT ON public.photographers
FOR EACH ROW EXECUTE FUNCTION public.ensure_photographer_private();

-- 6. updated_at trigger
DROP TRIGGER IF EXISTS trg_photographers_private_updated_at ON public.photographers_private;
CREATE TRIGGER trg_photographers_private_updated_at
BEFORE UPDATE ON public.photographers_private
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. REVOKE the sensitive columns from anon/authenticated on the public photographers table
-- so even if other code still reads them via the public policies, they cannot be exposed.
REVOKE SELECT (stripe_account_id, stripe_connected_at, pagarme_recipient_id, pagarme_kyc_status, business_tax_id, business_tax_name)
  ON public.photographers FROM anon, authenticated;
