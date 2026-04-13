-- Drop the wide-open anon INSERT on bookings (edge functions create bookings via service_role)
DROP POLICY IF EXISTS "Anyone can insert bookings" ON public.bookings;

-- Drop the wide-open anon SELECT on bookings
DROP POLICY IF EXISTS "Anyone can read booking by id" ON public.bookings;

-- Create a secure VIEW that only exposes safe fields for the confirmation page
CREATE OR REPLACE VIEW public.public_booking_info AS
SELECT
  b.id,
  b.status,
  b.payment_status,
  b.booked_date,
  b.session_id,
  b.photographer_id,
  b.availability_id,
  b.client_name,
  b.client_email,
  b.stripe_checkout_session_id
FROM public.bookings b;

-- Grant anon and authenticated access to the view
GRANT SELECT ON public.public_booking_info TO anon;
GRANT SELECT ON public.public_booking_info TO authenticated;

-- Enable RLS on bookings still allows authenticated photographer access via existing policies
-- Add authenticated INSERT for photographers (scoped to own id)
CREATE POLICY "Photographers can insert own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (photographer_id = get_my_photographer_id());