ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS nav_menu_style TEXT NOT NULL DEFAULT 'centered-split',
  ADD COLUMN IF NOT EXISTS nav_sticky_header BOOLEAN NOT NULL DEFAULT false;