
-- 1. Add day_of_week to session_availability (0=Sun,1=Mon,...,6=Sat)
--    and make date nullable (for backward compat); add break_after_minutes to sessions
ALTER TABLE public.session_availability
  ADD COLUMN IF NOT EXISTS day_of_week integer,
  ALTER COLUMN date DROP NOT NULL;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS break_after_minutes integer NOT NULL DEFAULT 0;

-- 2. Add booked_date to bookings so we know the actual date of the occurrence
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booked_date date;
