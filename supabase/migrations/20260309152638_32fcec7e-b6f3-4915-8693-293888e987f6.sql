
CREATE TABLE public.session_photo_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  min_photos integer NOT NULL DEFAULT 1,
  max_photos integer NULL,
  price_per_photo integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_photo_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own photo tiers"
  ON public.session_photo_tiers
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read photo tiers for active sessions"
  ON public.session_photo_tiers
  FOR SELECT
  TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_photo_tiers.session_id AND s.status = 'active'
  ));
