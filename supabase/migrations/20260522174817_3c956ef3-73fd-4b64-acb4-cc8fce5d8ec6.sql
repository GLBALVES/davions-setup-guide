
-- 1) blocked_times: restrict public SELECT to photographers with active sessions
DROP POLICY IF EXISTS "Anyone can read blocked times" ON public.blocked_times;
CREATE POLICY "Public read blocked times for active session photographers"
  ON public.blocked_times
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.photographer_id = blocked_times.photographer_id
        AND s.status = 'active'
    )
  );

-- 2) briefings: anon SELECT only for briefings referenced by an existing booking
DROP POLICY IF EXISTS "Anyone can read briefings by id" ON public.briefings;
CREATE POLICY "Anon read briefings referenced by a booking"
  ON public.briefings
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.sessions s ON s.id = b.session_id
      WHERE s.briefing_id = briefings.id
    )
  );

-- 3) booking_custom_field_values: tighten UPDATE/INSERT to bookings still in client-fillable state
DROP POLICY IF EXISTS "Anyone can update booking custom values" ON public.booking_custom_field_values;
DROP POLICY IF EXISTS "Anyone can insert booking custom values" ON public.booking_custom_field_values;

CREATE POLICY "Clients can insert booking custom values for open bookings"
  ON public.booking_custom_field_values
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_custom_field_values.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
    )
  );

CREATE POLICY "Clients can update booking custom values for open bookings"
  ON public.booking_custom_field_values
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_custom_field_values.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_custom_field_values.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
    )
  );

-- 4) photo_favorites: tighten DELETE so a client_token is required, and require it to actually match the row's token
DROP POLICY IF EXISTS "Clients can delete own favorites" ON public.photo_favorites;
CREATE POLICY "Clients can delete own favorites by token"
  ON public.photo_favorites
  FOR DELETE
  TO anon, authenticated
  USING (
    client_token IS NOT NULL
    AND length(client_token) >= 16
    AND current_setting('request.jwt.claims', true) IS NOT NULL  -- prevent silent fallthrough
    AND EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = photo_favorites.gallery_id
    )
  );

-- 5) workflow_email_dispatched: scope service_all_dispatched to service_role only
DROP POLICY IF EXISTS "service_all_dispatched" ON public.workflow_email_dispatched;
CREATE POLICY "service_all_dispatched"
  ON public.workflow_email_dispatched
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6) Storage: drop broad public-list SELECT policies; public URLs continue to work for public buckets without these policies.
DROP POLICY IF EXISTS "Anyone can read blog-module files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view creative assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view gallery photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for project documents" ON storage.objects;
DROP POLICY IF EXISTS "Session covers are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Site assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Site videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Watermark images are public" ON storage.objects;
