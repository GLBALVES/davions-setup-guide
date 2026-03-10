
-- page_seo_settings table
CREATE TABLE public.page_seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  page_name text NOT NULL,
  title text,
  meta_description text,
  meta_keywords text[] DEFAULT '{}',
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  noindex boolean NOT NULL DEFAULT false,
  nofollow boolean NOT NULL DEFAULT false,
  priority numeric NOT NULL DEFAULT 0.5,
  changefreq text NOT NULL DEFAULT 'weekly',
  structured_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, page_path)
);

ALTER TABLE public.page_seo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read page seo settings"
  ON public.page_seo_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Photographers can CRUD own page seo settings"
  ON public.page_seo_settings FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER set_updated_at_page_seo
  BEFORE UPDATE ON public.page_seo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- analytics_pageviews table
CREATE TABLE public.analytics_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  action text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pageviews"
  ON public.analytics_pageviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Photographers can read own pageviews"
  ON public.analytics_pageviews FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());
