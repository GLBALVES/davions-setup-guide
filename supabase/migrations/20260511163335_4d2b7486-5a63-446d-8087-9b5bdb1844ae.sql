UPDATE public.bookings b
SET deposit_paid_amount = sub.paid_cents
FROM (
  SELECT cp.booking_id, ROUND(SUM(pp.amount) * 100)::int AS paid_cents
  FROM public.project_payments pp
  JOIN public.client_projects cp ON cp.id = pp.project_id
  WHERE cp.booking_id IS NOT NULL
  GROUP BY cp.booking_id
) sub
WHERE b.id = sub.booking_id
  AND b.payment_status = 'deposit_paid'
  AND b.deposit_paid_amount IS NULL
  AND sub.paid_cents > 0;