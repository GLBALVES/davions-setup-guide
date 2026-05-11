ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_paid_amount integer,
  ADD COLUMN IF NOT EXISTS total_paid_amount integer;

COMMENT ON COLUMN public.bookings.deposit_paid_amount IS 'Actual deposit amount captured at payment time, in cents. Locked at payment.';
COMMENT ON COLUMN public.bookings.total_paid_amount IS 'Actual total amount paid (deposit + balance), in cents. Locked at full payment.';