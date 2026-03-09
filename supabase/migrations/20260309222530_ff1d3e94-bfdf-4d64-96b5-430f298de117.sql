-- Allow public (anon) read of published galleries
CREATE POLICY "Anyone can read published galleries"
  ON public.galleries FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Allow public (anon) read of photos in published galleries
CREATE POLICY "Anyone can read photos in published galleries"
  ON public.photos FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = photos.gallery_id AND g.status = 'published'
    )
  );