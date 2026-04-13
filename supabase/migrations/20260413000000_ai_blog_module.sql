-- AI Blog Module Migration
-- Creates all tables for the blog module with photographer_id for multi-tenant isolation

-- ─────────────────────────────────────────────
-- 1. Add photographer_id to existing blogs table
-- ─────────────────────────────────────────────
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS photographer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS blogs_photographer_id_idx ON public.blogs(photographer_id);

-- ─────────────────────────────────────────────
-- 2. ai_themes (was: themes)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_themes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  keywords    TEXT,
  category    TEXT,
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_themes_photographer_id_idx ON public.ai_themes(photographer_id);

ALTER TABLE public.ai_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_themes: owner full access" ON public.ai_themes
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 3. ai_blog_seo (was: blog_seo)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_seo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id         UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  meta_title      TEXT,
  meta_description TEXT,
  slug            TEXT,
  focus_keyword   TEXT,
  alt_text        TEXT,
  schema_markup   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_blog_seo_photographer_id_idx ON public.ai_blog_seo(photographer_id);
CREATE INDEX IF NOT EXISTS ai_blog_seo_blog_id_idx ON public.ai_blog_seo(blog_id);

ALTER TABLE public.ai_blog_seo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_blog_seo: owner full access" ON public.ai_blog_seo
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 4. ai_blog_images (was: blog_images)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id         UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  alt_text        TEXT,
  prompt          TEXT,
  position        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_blog_images_photographer_id_idx ON public.ai_blog_images(photographer_id);
CREATE INDEX IF NOT EXISTS ai_blog_images_blog_id_idx ON public.ai_blog_images(blog_id);

ALTER TABLE public.ai_blog_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_blog_images: owner full access" ON public.ai_blog_images
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 5. ai_blog_versions (was: blog_versions)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_versions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blog_id         UUID REFERENCES public.blogs(id) ON DELETE CASCADE,
  content         TEXT,
  version         INTEGER DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_blog_versions_photographer_id_idx ON public.ai_blog_versions(photographer_id);
CREATE INDEX IF NOT EXISTS ai_blog_versions_blog_id_idx ON public.ai_blog_versions(blog_id);

ALTER TABLE public.ai_blog_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_blog_versions: owner full access" ON public.ai_blog_versions
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 6. ai_blog_config (was: module_config)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_blog_config (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name         TEXT,
  default_cta          TEXT,
  default_tone         TEXT DEFAULT 'Informativo e próximo',
  default_language     TEXT DEFAULT 'Português',
  default_article_size TEXT DEFAULT 'Médio (800–1200 palavras)',
  default_image_prompt TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_blog_config_photographer_id_idx ON public.ai_blog_config(photographer_id);

ALTER TABLE public.ai_blog_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_blog_config: owner full access" ON public.ai_blog_config
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 7. RLS on blogs table (photographer_id scoped)
-- ─────────────────────────────────────────────
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blogs' AND policyname = 'blogs: owner full access'
  ) THEN
    CREATE POLICY "blogs: owner full access" ON public.blogs
      FOR ALL USING (auth.uid() = photographer_id)
      WITH CHECK (auth.uid() = photographer_id);
  END IF;
END
$$;
