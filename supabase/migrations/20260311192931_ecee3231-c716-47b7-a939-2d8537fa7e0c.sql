
CREATE TABLE public.blocked_times (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL,
  date date NOT NULL,
  start_time time without time zone NOT NULL DEFAULT '00:00:00',
  end_time time without time zone NOT NULL DEFAULT '23:59:00',
  reason text NULL,
  all_day boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own blocked times"
  ON public.blocked_times
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read blocked times"
  ON public.blocked_times
  FOR SELECT
  TO anon, authenticated
  USING (true);
