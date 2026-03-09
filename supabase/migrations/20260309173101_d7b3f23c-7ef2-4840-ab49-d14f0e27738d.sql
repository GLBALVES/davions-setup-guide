ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS booking_notice_days integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS booking_window_days integer NOT NULL DEFAULT 60;