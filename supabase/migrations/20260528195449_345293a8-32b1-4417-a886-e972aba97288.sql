ALTER TABLE public.project_invoices ADD COLUMN IF NOT EXISTS pagarme_order_id text;
CREATE INDEX IF NOT EXISTS idx_project_invoices_pagarme_order_id ON public.project_invoices(pagarme_order_id);