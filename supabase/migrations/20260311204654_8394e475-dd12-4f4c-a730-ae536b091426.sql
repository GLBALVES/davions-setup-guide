
CREATE TABLE public.sidebar_favorites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL,
  item_key text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, item_key)
);

ALTER TABLE public.sidebar_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own sidebar favorites"
  ON public.sidebar_favorites
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
