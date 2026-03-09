
-- Add store_slug to photographers
ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS store_slug text UNIQUE;

-- Create sessions table
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  price integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 60,
  num_photos integer NOT NULL DEFAULT 0,
  location text,
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own sessions"
  ON public.sessions FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read active sessions"
  ON public.sessions FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Create session_availability table
CREATE TABLE public.session_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_booked boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.session_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own availability"
  ON public.session_availability FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Anyone can read availability for active sessions"
  ON public.session_availability FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_availability.session_id AND s.status = 'active'
    )
  );

-- Create bookings table
CREATE TABLE public.bookings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  availability_id uuid NOT NULL REFERENCES public.session_availability(id) ON DELETE CASCADE,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can read own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (photographer_id = auth.uid());

CREATE POLICY "Anyone can insert bookings"
  ON public.bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Photographers can update own bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (photographer_id = auth.uid());

-- Storage bucket for session covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-covers', 'session-covers', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Session covers are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'session-covers');

CREATE POLICY "Photographers can upload session covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'session-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photographers can update session covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'session-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Photographers can delete session covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'session-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Timestamps trigger for sessions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
