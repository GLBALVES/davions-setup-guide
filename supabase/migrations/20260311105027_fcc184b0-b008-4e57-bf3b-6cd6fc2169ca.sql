
-- Create photographer_site table for website configuration
CREATE TABLE public.photographer_site (
  photographer_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Branding
  logo_url          TEXT,
  tagline           TEXT,
  accent_color      TEXT DEFAULT '#000000',

  -- Hero section
  site_headline     TEXT,
  site_subheadline  TEXT,
  cta_text          TEXT DEFAULT 'Book a Session',
  cta_link          TEXT,

  -- About section
  about_title       TEXT DEFAULT 'About',
  about_image_url   TEXT,

  -- Social media
  instagram_url     TEXT,
  facebook_url      TEXT,
  pinterest_url     TEXT,
  tiktok_url        TEXT,
  youtube_url       TEXT,
  whatsapp          TEXT,
  linkedin_url      TEXT,

  -- Navigation / sections visibility
  show_store        BOOLEAN DEFAULT TRUE,
  show_blog         BOOLEAN DEFAULT FALSE,
  show_booking      BOOLEAN DEFAULT TRUE,
  show_about        BOOLEAN DEFAULT TRUE,
  show_contact      BOOLEAN DEFAULT TRUE,

  -- Template
  site_template     TEXT DEFAULT 'editorial',

  -- SEO
  seo_title         TEXT,
  seo_description   TEXT,
  og_image_url      TEXT,

  -- Analytics
  google_analytics_id TEXT,
  facebook_pixel_id   TEXT,

  -- Footer
  footer_text       TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.photographer_site ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own site settings"
  ON public.photographer_site
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Public can read site settings"
  ON public.photographer_site
  FOR SELECT
  TO anon
  USING (true);

-- Updated_at trigger
CREATE TRIGGER update_photographer_site_updated_at
  BEFORE UPDATE ON public.photographer_site
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for logos/site assets
INSERT INTO storage.buckets (id, name, public) VALUES ('site-assets', 'site-assets', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Photographers can upload site assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Site assets are publicly readable"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'site-assets');

CREATE POLICY "Photographers can update own site assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photographers can delete own site assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-assets' AND auth.uid()::text = (storage.foldername(name))[1]);
