ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'solid',
  ADD COLUMN IF NOT EXISTS button_shape text DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS button_size text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS button_height integer DEFAULT 14,
  ADD COLUMN IF NOT EXISTS button_width integer DEFAULT 30;