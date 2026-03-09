
CREATE TABLE IF NOT EXISTS public.session_day_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  hours_start time WITHOUT TIME ZONE DEFAULT NULL,
  hours_end time WITHOUT TIME ZONE DEFAULT NULL,
  buffer_before_min integer NOT NULL DEFAULT 0,
  buffer_after_min integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, day_of_week)
);

ALTER TABLE public.session_day_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own day configs"
  ON public.session_day_config
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read day configs for active sessions"
  ON public.session_day_config
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_day_config.session_id AND s.status = 'active'
  ));
