
-- Admin SELECT policies on key tables
CREATE POLICY "Admins can read all photographers"
  ON public.photographers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all galleries"
  ON public.galleries FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all analytics"
  ON public.analytics_pageviews FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
