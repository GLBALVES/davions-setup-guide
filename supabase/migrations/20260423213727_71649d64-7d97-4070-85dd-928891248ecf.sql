ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS footer_layout text,
  ADD COLUMN IF NOT EXISTS footer_logo_position text,
  ADD COLUMN IF NOT EXISTS footer_alignment text,
  ADD COLUMN IF NOT EXISTS footer_show_nav boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_show_sitemap boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_show_contact_info boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_show_tagline boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS footer_tagline text,
  ADD COLUMN IF NOT EXISTS footer_columns jsonb;