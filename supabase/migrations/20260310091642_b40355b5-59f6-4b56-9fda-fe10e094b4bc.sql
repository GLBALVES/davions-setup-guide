
-- Create watermarks table
CREATE TABLE public.watermarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  text_enabled boolean NOT NULL DEFAULT true,
  text_content text,
  text_font text NOT NULL DEFAULT 'serif',
  text_color text NOT NULL DEFAULT '#ffffff',
  text_opacity numeric NOT NULL DEFAULT 0.9,
  text_scale numeric NOT NULL DEFAULT 0.5,
  text_position text NOT NULL DEFAULT 'bottom-center',
  image_enabled boolean NOT NULL DEFAULT false,
  image_url text,
  image_opacity numeric NOT NULL DEFAULT 0.8,
  image_scale numeric NOT NULL DEFAULT 0.4,
  image_position text NOT NULL DEFAULT 'center',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.watermarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own watermarks"
  ON public.watermarks FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_watermarks_updated_at
  BEFORE UPDATE ON public.watermarks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.galleries
  ADD COLUMN IF NOT EXISTS watermark_id uuid REFERENCES public.watermarks(id) ON DELETE SET NULL;

INSERT INTO storage.buckets (id, name, public)
VALUES ('watermarks', 'watermarks', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Watermark images are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'watermarks');

CREATE POLICY "Photographers can upload own watermarks"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'watermarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photographers can update own watermarks"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'watermarks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photographers can delete own watermarks"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'watermarks' AND auth.uid()::text = (storage.foldername(name))[1]);
