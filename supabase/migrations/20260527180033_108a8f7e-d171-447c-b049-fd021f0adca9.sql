
-- 1. Hide gallery access_code from anon/authenticated (column-level)
REVOKE SELECT (access_code) ON public.galleries FROM anon, authenticated;

-- 2. Tighten booking_briefing_responses INSERT with WITH CHECK
DROP POLICY IF EXISTS "Anyone can insert briefing responses" ON public.booking_briefing_responses;
CREATE POLICY "Clients can insert briefing responses for open bookings"
  ON public.booking_briefing_responses
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_briefing_responses.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
    )
  );

-- 3. Tighten booking_custom_field_values UPDATE: only within 24h of booking creation
DROP POLICY IF EXISTS "Clients can update booking custom values for open bookings" ON public.booking_custom_field_values;
CREATE POLICY "Clients can update booking custom values within window"
  ON public.booking_custom_field_values
  FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_custom_field_values.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
        AND b.created_at > now() - interval '24 hours'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_custom_field_values.booking_id
        AND COALESCE(b.status, '') NOT IN ('completed','cancelled','refunded')
        AND b.created_at > now() - interval '24 hours'
    )
  );

-- 4. Tighten photo_favorites INSERT with WITH CHECK validating gallery and client_token
DROP POLICY IF EXISTS "Clients can insert favorites" ON public.photo_favorites;
CREATE POLICY "Clients can insert favorites with valid token"
  ON public.photo_favorites
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    client_token IS NOT NULL
    AND length(client_token) >= 16
    AND EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = photo_favorites.gallery_id
        AND g.status = 'published'
    )
  );
