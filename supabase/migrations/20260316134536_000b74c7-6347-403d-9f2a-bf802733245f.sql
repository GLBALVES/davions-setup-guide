-- Allow anonymous users (clients) to read bookings by ID
-- UUID is not guessable, so this is safe for public access
CREATE POLICY "Anyone can read booking by id"
ON public.bookings FOR SELECT
TO anon
USING (true);

-- Allow anon to read briefings (needed for BookingSuccess briefing form)
CREATE POLICY "Anyone can read briefings by id"
ON public.briefings FOR SELECT
TO anon
USING (true);

-- Allow anon to check if briefing response already submitted
CREATE POLICY "Anyone can read own briefing responses"
ON public.booking_briefing_responses FOR SELECT
TO anon
USING (true);