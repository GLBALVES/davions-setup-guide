
CREATE TABLE public.gallery_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL,
  key text NOT NULL,
  value text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, key)
);

ALTER TABLE public.gallery_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own gallery settings"
  ON public.gallery_settings
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_gallery_settings_updated_at
  BEFORE UPDATE ON public.gallery_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
