
CREATE POLICY "Anyone can read photographer info for active sessions"
ON public.photographers
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions
    WHERE sessions.photographer_id = photographers.id
      AND sessions.status = 'active'
  )
);
