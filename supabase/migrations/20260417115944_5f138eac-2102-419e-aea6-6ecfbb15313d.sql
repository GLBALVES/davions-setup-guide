
-- 1. Soft-delete em site_pages (Trash)
ALTER TABLE public.site_pages
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_site_pages_deleted_at
  ON public.site_pages(photographer_id, deleted_at);

-- 2. Novas colunas em photographer_site (Style + Advanced + Tracking)
ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS logo_alt_url text,
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS custom_head_html text,
  ADD COLUMN IF NOT EXISTS custom_body_html text,
  ADD COLUMN IF NOT EXISTS redirects jsonb DEFAULT '[]'::jsonb;

-- 3. Tabela form_submissions (Inbox de formulários do site público)
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  page_id uuid REFERENCES public.site_pages(id) ON DELETE SET NULL,
  page_title text NOT NULL DEFAULT '',
  form_label text NOT NULL DEFAULT 'Contact Form',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamp with time zone,
  archived boolean NOT NULL DEFAULT false,
  source_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_photographer
  ON public.form_submissions(photographer_id, created_at DESC);

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit forms"
  ON public.form_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Photographers can read own submissions"
  ON public.form_submissions
  FOR SELECT
  TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Photographers can update own submissions"
  ON public.form_submissions
  FOR UPDATE
  TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Photographers can delete own submissions"
  ON public.form_submissions
  FOR DELETE
  TO authenticated
  USING (photographer_id = get_my_photographer_id());
