
CREATE OR REPLACE FUNCTION public.sync_photographers_private()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.photographers_private (
    photographer_id,
    stripe_account_id, stripe_connected_at,
    pagarme_recipient_id, pagarme_kyc_status,
    business_tax_id, business_tax_name
  ) VALUES (
    NEW.id,
    NEW.stripe_account_id, NEW.stripe_connected_at,
    NEW.pagarme_recipient_id, NEW.pagarme_kyc_status,
    NEW.business_tax_id, NEW.business_tax_name
  )
  ON CONFLICT (photographer_id) DO UPDATE SET
    stripe_account_id    = EXCLUDED.stripe_account_id,
    stripe_connected_at  = EXCLUDED.stripe_connected_at,
    pagarme_recipient_id = EXCLUDED.pagarme_recipient_id,
    pagarme_kyc_status   = EXCLUDED.pagarme_kyc_status,
    business_tax_id      = EXCLUDED.business_tax_id,
    business_tax_name    = EXCLUDED.business_tax_name,
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_photographers_private ON public.photographers;
CREATE TRIGGER trg_sync_photographers_private
AFTER INSERT OR UPDATE OF stripe_account_id, stripe_connected_at, pagarme_recipient_id, pagarme_kyc_status, business_tax_id, business_tax_name
ON public.photographers
FOR EACH ROW EXECUTE FUNCTION public.sync_photographers_private();
