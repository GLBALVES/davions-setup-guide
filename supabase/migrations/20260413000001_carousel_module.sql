-- Carousel Module Migration
-- Creates all tables for the Creative Studio carousel module with photographer_id for multi-tenant isolation

-- ─────────────────────────────────────────────
-- 1. carousel_historico (was: carrossel_historico)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carousel_historico (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tema            TEXT NOT NULL,
  tom             TEXT,
  nicho           TEXT,
  slides_json     JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carousel_historico_photographer_id_idx ON public.carousel_historico(photographer_id);
CREATE INDEX IF NOT EXISTS carousel_historico_created_at_idx ON public.carousel_historico(created_at DESC);

ALTER TABLE public.carousel_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_historico: owner full access" ON public.carousel_historico
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 2. carousel_image_library (was: image_library)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carousel_image_library (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url             TEXT NOT NULL,
  source          TEXT NOT NULL CHECK (source IN ('upload', 'ai')),
  prompt          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carousel_image_library_photographer_id_idx ON public.carousel_image_library(photographer_id);

ALTER TABLE public.carousel_image_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_image_library: owner full access" ON public.carousel_image_library
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);

-- ─────────────────────────────────────────────
-- 3. carousel_meta_config (was: meta_config)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.carousel_meta_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  app_id          TEXT,
  access_token    TEXT,
  ig_account_id   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS carousel_meta_config_photographer_id_idx ON public.carousel_meta_config(photographer_id);

ALTER TABLE public.carousel_meta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carousel_meta_config: owner full access" ON public.carousel_meta_config
  FOR ALL USING (auth.uid() = photographer_id)
  WITH CHECK (auth.uid() = photographer_id);
