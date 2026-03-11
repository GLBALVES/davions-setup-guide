
-- Briefing templates
CREATE TABLE public.briefings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  name            text NOT NULL DEFAULT '',
  questions       jsonb NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own briefings"
  ON public.briefings FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_briefings_updated_at
  BEFORE UPDATE ON public.briefings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client answers linked to a booking
CREATE TABLE public.booking_briefing_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid NOT NULL,
  briefing_id  uuid NOT NULL,
  answers      jsonb NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_briefing_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert briefing responses"
  ON public.booking_briefing_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Photographers can read own briefing responses"
  ON public.booking_briefing_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.photographer_id = auth.uid()
    )
  );

-- Add briefing_id reference to sessions
ALTER TABLE public.sessions
  ADD COLUMN briefing_id uuid REFERENCES public.briefings(id) ON DELETE SET NULL;
