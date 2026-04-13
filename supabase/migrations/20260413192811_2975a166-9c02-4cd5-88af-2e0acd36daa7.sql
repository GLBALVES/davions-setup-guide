ALTER TABLE public.carousel_historico
  ADD COLUMN IF NOT EXISTS background_config jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS layout_model text DEFAULT 'model1';