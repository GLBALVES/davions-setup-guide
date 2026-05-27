
-- 1) photo_favorites: remove broad SELECT, add owner SELECT, add token-scoped RPC
DROP POLICY IF EXISTS "Anyone can read favorites" ON public.photo_favorites;

CREATE POLICY "Photographers read own gallery favorites"
ON public.photo_favorites
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = photo_favorites.gallery_id
      AND g.photographer_id = public.get_my_photographer_id()
  )
);

CREATE OR REPLACE FUNCTION public.get_gallery_favorites_by_token(
  _gallery_id uuid,
  _client_token text
)
RETURNS TABLE(photo_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pf.photo_id
  FROM public.photo_favorites pf
  JOIN public.galleries g ON g.id = pf.gallery_id
  WHERE pf.gallery_id = _gallery_id
    AND pf.client_token = _client_token
    AND _client_token IS NOT NULL
    AND length(_client_token) >= 16
    AND g.status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.get_gallery_favorites_by_token(uuid, text) TO anon, authenticated;

-- 2) Storage: enforce folder ownership on mutations
-- blog-images
DROP POLICY IF EXISTS "Authenticated users can delete own blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
CREATE POLICY "Authenticated users can upload own blog images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated users can delete own blog images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- creative-assets
DROP POLICY IF EXISTS "Authenticated users can delete own creative assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload creative assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload own creative assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'creative-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Authenticated users can delete own creative assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'creative-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- blog-module
DROP POLICY IF EXISTS "Auth users can upload blog-module files" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update blog-module files" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete blog-module files" ON storage.objects;
CREATE POLICY "Auth users can upload own blog-module files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blog-module' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth users can update own blog-module files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'blog-module' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Auth users can delete own blog-module files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blog-module' AND (storage.foldername(name))[1] = auth.uid()::text);
