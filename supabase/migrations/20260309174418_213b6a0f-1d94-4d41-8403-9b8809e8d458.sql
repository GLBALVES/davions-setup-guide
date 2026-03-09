
ALTER TABLE public.session_day_config
  DROP CONSTRAINT IF EXISTS session_day_config_day_of_week_check;

ALTER TABLE public.session_day_config
  ADD CONSTRAINT session_day_config_day_of_week_check
    CHECK (day_of_week >= -1 AND day_of_week <= 6);
