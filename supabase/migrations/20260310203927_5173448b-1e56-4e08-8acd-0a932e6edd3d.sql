
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  slug TEXT,
  content TEXT NOT NULL DEFAULT '',
  summary TEXT,
  author TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  mid_image_1 TEXT,
  mid_image_2 TEXT,
  tags TEXT[] DEFAULT '{}',
  published BOOLEAN NOT NULL DEFAULT false,
  featured BOOLEAN NOT NULL DEFAULT false,
  category TEXT,
  meta_description TEXT,
  meta_keywords TEXT[] DEFAULT '{}',
  canonical_url TEXT,
  og_image_url TEXT,
  reading_time_min INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  footer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blog categories table
CREATE TABLE public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blog themes table (AI-generated topic ideas)
CREATE TABLE public.blog_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  description TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  used_by_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blog settings table (key-value store)
CREATE TABLE public.blog_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(photographer_id, key)
);

-- Enable RLS on all tables
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for blog_posts
CREATE POLICY "Photographers can CRUD own blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());
CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (published = true);

-- RLS policies for blog_categories
CREATE POLICY "Photographers can CRUD own blog categories" ON public.blog_categories FOR ALL TO authenticated
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());
CREATE POLICY "Anyone can read blog categories" ON public.blog_categories FOR SELECT TO anon, authenticated
  USING (true);

-- RLS policies for blog_themes
CREATE POLICY "Photographers can CRUD own blog themes" ON public.blog_themes FOR ALL TO authenticated
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- RLS policies for blog_settings
CREATE POLICY "Photographers can CRUD own blog settings" ON public.blog_settings FOR ALL TO authenticated
  USING (photographer_id = auth.uid()) WITH CHECK (photographer_id = auth.uid());

-- Updated_at trigger for blog_posts
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unique slug per photographer
CREATE UNIQUE INDEX blog_posts_photographer_slug_idx ON public.blog_posts(photographer_id, slug);
