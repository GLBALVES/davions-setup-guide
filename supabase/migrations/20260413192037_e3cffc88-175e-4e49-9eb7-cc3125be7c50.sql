ALTER TABLE public.carousel_historico
  ADD COLUMN IF NOT EXISTS tom text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nicho text DEFAULT '';