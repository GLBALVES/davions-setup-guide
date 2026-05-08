-- Back-fill missing contract snapshots for already-paid bookings
UPDATE public.bookings b
SET
  contract_html_snapshot = COALESCE(b.contract_html_snapshot, s.contract_text),
  contract_signed_at = COALESCE(b.contract_signed_at, now()),
  contract_locked = TRUE
FROM public.sessions s
WHERE b.session_id = s.id
  AND s.contract_text IS NOT NULL
  AND b.payment_status IN ('paid','deposit_paid')
  AND (b.contract_html_snapshot IS NULL OR b.contract_locked IS DISTINCT FROM TRUE);

-- Mirror into client_projects
UPDATE public.client_projects cp
SET
  signed_contract_html = b.contract_html_snapshot,
  contract_signed_at = b.contract_signed_at,
  contract_signed_ip = b.contract_signed_ip,
  contract_signed_user_agent = b.contract_signed_user_agent
FROM public.bookings b
WHERE cp.booking_id = b.id
  AND b.contract_html_snapshot IS NOT NULL
  AND (cp.signed_contract_html IS NULL OR cp.signed_contract_html = '');