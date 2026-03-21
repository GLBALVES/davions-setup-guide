CREATE TABLE IF NOT EXISTS public.site_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Page',
  slug text NOT NULL,
  parent_id uuid REFERENCES public.site_pages(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_home boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sections_order jsonb DEFAULT '[]',
  page_content jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photographer_id, slug)
);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own site pages"
  ON public.site_pages
  FOR ALL
  TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

CREATE POLICY "Public can read site pages"
  ON public.site_pages
  FOR SELECT
  TO anon
  USING (true);

CREATE TRIGGER update_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();