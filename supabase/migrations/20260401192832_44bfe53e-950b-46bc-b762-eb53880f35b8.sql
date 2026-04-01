
CREATE TABLE public.session_bonuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.session_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers manage own bonuses"
  ON public.session_bonuses
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Public can read bonuses"
  ON public.session_bonuses
  FOR SELECT
  TO anon
  USING (true);
