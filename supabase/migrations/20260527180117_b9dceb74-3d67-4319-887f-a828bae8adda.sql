
DROP POLICY IF EXISTS "Anyone can read bug screenshots" ON storage.objects;
CREATE POLICY "Users and admins can read bug screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bug-screenshots'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );
