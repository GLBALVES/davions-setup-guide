DROP POLICY IF EXISTS "Admins can update photographers" ON public.photographers;

CREATE POLICY "Admins can update photographers"
ON public.photographers
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));