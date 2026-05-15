ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2),
  ADD COLUMN IF NOT EXISTS platform_fee_amount integer DEFAULT 0;

COMMENT ON COLUMN public.bookings.platform_fee_percent IS 'Platform transaction fee percentage applied at checkout (snapshot from photographer plan).';
COMMENT ON COLUMN public.bookings.platform_fee_amount IS 'Platform transaction fee amount in cents, retained by the platform from this booking.';