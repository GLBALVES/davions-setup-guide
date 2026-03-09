
-- Create storage bucket for gallery photos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('gallery-photos', 'gallery-photos', true, 52428800);

-- RLS: photographers can upload to their own folder
CREATE POLICY "Photographers can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Photographers can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view gallery photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery-photos');
