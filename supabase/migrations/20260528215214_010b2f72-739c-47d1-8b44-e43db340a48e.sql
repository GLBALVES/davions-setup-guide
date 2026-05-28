UPDATE public.project_invoices
SET paid_amount = amount, status = 'paid', paid_at = now()
WHERE id IN ('f33410fb-a9b1-407e-b4f6-98c253949128','df24d56a-9ecc-4499-bb15-4f834b96cdd2')
  AND status <> 'paid';