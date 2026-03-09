
CREATE TABLE public.session_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  description text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  price integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own session extras"
  ON public.session_extras
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read extras for active sessions"
  ON public.session_extras
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_extras.session_id AND s.status = 'active'
  ));
