-- Create public bucket for site videos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-videos',
  'site-videos',
  true,
  104857600, -- 100MB
  ARRAY['video/mp4','video/webm','video/quicktime','video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read
CREATE POLICY "Site videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'site-videos');

-- Authenticated users upload to their own folder (folder name = auth.uid())
CREATE POLICY "Users can upload their own site videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'site-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own site videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'site-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own site videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'site-videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);