
-- Table: mkt_social_posts
CREATE TABLE public.mkt_social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  platform TEXT NOT NULL DEFAULT 'instagram',
  post_type TEXT NOT NULL DEFAULT 'feed',
  caption TEXT,
  hashtags TEXT[] DEFAULT '{}',
  media_urls JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mkt_social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own social posts" ON public.mkt_social_posts FOR ALL TO authenticated USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- Table: creative_templates
CREATE TABLE public.creative_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  format TEXT NOT NULL DEFAULT 'post_1080',
  background_config JSONB DEFAULT '{}',
  elements JSONB DEFAULT '[]',
  footer_config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own creative templates" ON public.creative_templates FOR ALL TO authenticated USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- Table: creative_images
CREATE TABLE public.creative_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own creative images" ON public.creative_images FOR ALL TO authenticated USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- Table: social_api_connections
CREATE TABLE public.social_api_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'facebook',
  credentials JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(photographer_id, platform)
);
ALTER TABLE public.social_api_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own social connections" ON public.social_api_connections FOR ALL TO authenticated USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- Storage bucket for creative assets
INSERT INTO storage.buckets (id, name, public) VALUES ('creative-assets', 'creative-assets', true) ON CONFLICT DO NOTHING;
CREATE POLICY "Authenticated users can upload creative assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creative-assets');
CREATE POLICY "Anyone can view creative assets" ON storage.objects FOR SELECT USING (bucket_id = 'creative-assets');
CREATE POLICY "Authenticated users can delete own creative assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'creative-assets');

-- Brand assets table
CREATE TABLE public.brand_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  file_url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  category TEXT NOT NULL DEFAULT 'logo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brand_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own brand assets" ON public.brand_assets FOR ALL TO authenticated USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());
