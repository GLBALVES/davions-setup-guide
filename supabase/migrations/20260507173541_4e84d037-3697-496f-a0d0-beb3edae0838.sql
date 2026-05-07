ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS balance_due_timing text NOT NULL DEFAULT 'session_day',
  ADD COLUMN IF NOT EXISTS balance_due_offset_hours integer NOT NULL DEFAULT 0;

ALTER TABLE public.sessions
  DROP CONSTRAINT IF EXISTS sessions_balance_due_timing_check;

ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_balance_due_timing_check
  CHECK (balance_due_timing IN ('session_day', 'gallery_checkout', 'after_delivery'));