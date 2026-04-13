-- Fix security definer view issue
CREATE OR REPLACE VIEW public.public_booking_info
WITH (security_invoker = true) AS
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