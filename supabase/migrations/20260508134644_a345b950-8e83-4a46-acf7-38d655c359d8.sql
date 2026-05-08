ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS contract_locked BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS signed_contract_html TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contract_signed_ip TEXT,
  ADD COLUMN IF NOT EXISTS contract_signed_user_agent TEXT;