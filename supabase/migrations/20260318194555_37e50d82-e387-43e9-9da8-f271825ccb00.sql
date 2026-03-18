
-- Fix site-assets UPDATE policy to include WITH CHECK clause
-- (required when upsert:true triggers an UPDATE on existing files)

DROP POLICY IF EXISTS "Photographers can update own site assets" ON storage.objects;

CREATE POLICY "Photographers can update own site assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'site-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
