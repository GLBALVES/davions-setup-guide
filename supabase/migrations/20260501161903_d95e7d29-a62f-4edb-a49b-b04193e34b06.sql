ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS client_tax_id text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS contract_html_snapshot text;