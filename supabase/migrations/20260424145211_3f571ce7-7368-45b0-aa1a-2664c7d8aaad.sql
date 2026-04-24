-- Public read access for published blogs
CREATE POLICY "Anyone can read published blogs"
ON public.blogs
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Optional hero fields for the public blog listing page
ALTER TABLE public.photographer_site
ADD COLUMN IF NOT EXISTS blog_title TEXT,
ADD COLUMN IF NOT EXISTS blog_description TEXT;