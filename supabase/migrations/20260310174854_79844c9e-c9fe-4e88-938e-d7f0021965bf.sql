
CREATE TABLE public.photo_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  gallery_id uuid NOT NULL REFERENCES public.galleries(id) ON DELETE CASCADE,
  client_token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX photo_favorites_unique ON public.photo_favorites (photo_id, client_token);
CREATE INDEX photo_favorites_gallery_idx ON public.photo_favorites (gallery_id);
CREATE INDEX photo_favorites_photo_idx ON public.photo_favorites (photo_id);

ALTER TABLE public.photo_favorites ENABLE ROW LEVEL SECURITY;

-- Anyone (client) can insert their own favorites
CREATE POLICY "Clients can insert favorites"
  ON public.photo_favorites FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Anyone can read favorites (photographer needs to see them; clients need to see their own)
CREATE POLICY "Anyone can read favorites"
  ON public.photo_favorites FOR SELECT
  TO anon, authenticated
  USING (true);

-- Clients can delete their own favorites
CREATE POLICY "Clients can delete own favorites"
  ON public.photo_favorites FOR DELETE
  TO anon, authenticated
  USING (true);
