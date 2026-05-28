ALTER TABLE public.project_invoices
  ADD COLUMN IF NOT EXISTS charge_timing text NOT NULL DEFAULT 'end'
  CHECK (charge_timing IN ('end','date','checkout'));