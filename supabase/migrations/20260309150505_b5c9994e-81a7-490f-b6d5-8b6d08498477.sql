ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_tip boolean NOT NULL DEFAULT false;