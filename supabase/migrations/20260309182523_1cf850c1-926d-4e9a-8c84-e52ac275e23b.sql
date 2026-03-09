
-- Add custom_domain field to photographers
ALTER TABLE public.photographers
  ADD COLUMN custom_domain TEXT UNIQUE;

-- Index for fast lookup by custom domain
CREATE INDEX idx_photographers_custom_domain
  ON public.photographers (custom_domain)
  WHERE custom_domain IS NOT NULL;

-- Allow anyone (anon + authenticated) to resolve a photographer by custom domain
-- so the public store can load when accessed from a custom domain
CREATE POLICY "Anyone can look up photographer by custom domain"
  ON public.photographers
  FOR SELECT
  TO anon, authenticated
  USING (custom_domain IS NOT NULL);
