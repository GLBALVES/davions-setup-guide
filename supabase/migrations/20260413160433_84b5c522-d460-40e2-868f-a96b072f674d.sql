
-- 1. ai_blog_config
CREATE TABLE public.ai_blog_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  company_name text NOT NULL DEFAULT '',
  default_cta text DEFAULT '',
  default_tone text DEFAULT 'Informativo e próximo',
  default_language text DEFAULT 'Português',
  default_article_size text DEFAULT 'Médio (800–1200 palavras)',
  default_image_prompt text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photographer_id)
);
ALTER TABLE public.ai_blog_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own ai_blog_config" ON public.ai_blog_config FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- 2. ai_themes
CREATE TABLE public.ai_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  keyword text NOT NULL DEFAULT '',
  secondary_keywords text[] DEFAULT '{}',
  intent text,
  tone text,
  language text,
  status text NOT NULL DEFAULT 'available',
  generated_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  blog_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own ai_themes" ON public.ai_themes FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- 3. blogs
CREATE TABLE public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  theme_id uuid,
  title text NOT NULL DEFAULT '',
  slug text,
  content text NOT NULL DEFAULT '',
  keyword text,
  secondary_keywords text[] DEFAULT '{}',
  mode text NOT NULL DEFAULT 'auto',
  status text NOT NULL DEFAULT 'draft',
  word_count integer DEFAULT 0,
  reading_time_minutes integer DEFAULT 0,
  cta_text text,
  cover_image_url text,
  cover_image_alt text,
  middle_image_url text,
  middle_image_alt text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own blogs" ON public.blogs FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- 4. ai_blog_images
CREATE TABLE public.ai_blog_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  position text NOT NULL DEFAULT 'cover',
  image_url text NOT NULL DEFAULT '',
  alt_text text,
  prompt_used text,
  selected boolean DEFAULT false,
  photographer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_blog_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own ai_blog_images" ON public.ai_blog_images FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- 5. ai_blog_seo
CREATE TABLE public.ai_blog_seo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id uuid NOT NULL REFERENCES public.blogs(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL,
  meta_title text,
  meta_description text,
  slug text,
  secondary_keywords text[] DEFAULT '{}',
  og_title text,
  og_description text,
  score integer DEFAULT 0,
  checklist jsonb DEFAULT '{}',
  cannibalization_warning boolean DEFAULT false,
  cannibalization_conflict_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(blog_id)
);
ALTER TABLE public.ai_blog_seo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Photographers can CRUD own ai_blog_seo" ON public.ai_blog_seo FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- 6. Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-module', 'blog-module', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read blog-module files" ON storage.objects FOR SELECT USING (bucket_id = 'blog-module');
CREATE POLICY "Auth users can upload blog-module files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-module');
CREATE POLICY "Auth users can update blog-module files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-module');
CREATE POLICY "Auth users can delete blog-module files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-module');
