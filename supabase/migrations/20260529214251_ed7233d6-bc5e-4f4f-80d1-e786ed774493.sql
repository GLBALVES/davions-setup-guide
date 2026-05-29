-- Add client_token to bookings for authenticating contract acceptance from anonymous clients
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS client_token text;

-- Generate token on insert if not provided
CREATE OR REPLACE FUNCTION public.set_booking_client_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_token IS NULL OR length(NEW.client_token) < 16 THEN
    NEW.client_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_set_client_token ON public.bookings;
CREATE TRIGGER bookings_set_client_token
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_client_token();

-- Backfill existing rows
UPDATE public.bookings
   SET client_token = encode(gen_random_bytes(32), 'hex')
 WHERE client_token IS NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_client_token ON public.bookings(client_token);