
-- Table: carousel_historico
CREATE TABLE IF NOT EXISTS public.carousel_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  tema text NOT NULL DEFAULT '',
  slides_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carousel_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own carousel_historico"
  ON public.carousel_historico FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- Table: carousel_meta_config
CREATE TABLE IF NOT EXISTS public.carousel_meta_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL UNIQUE,
  app_id text NOT NULL DEFAULT '',
  access_token text NOT NULL DEFAULT '',
  ig_account_id text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carousel_meta_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own carousel_meta_config"
  ON public.carousel_meta_config FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- Table: carousel_image_library
CREATE TABLE IF NOT EXISTS public.carousel_image_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.carousel_image_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own carousel_image_library"
  ON public.carousel_image_library FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());
