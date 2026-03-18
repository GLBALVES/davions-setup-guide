
-- Fix site-assets SELECT policy: currently only covers anon role
-- Authenticated users need SELECT to perform upsert operations
DROP POLICY IF EXISTS "Site assets are publicly readable" ON storage.objects;

CREATE POLICY "Site assets are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-assets');
