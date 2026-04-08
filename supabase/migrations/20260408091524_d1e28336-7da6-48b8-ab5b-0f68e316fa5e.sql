
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT NULL,
  birth_date DATE DEFAULT NULL,
  address_street TEXT DEFAULT NULL,
  address_city TEXT DEFAULT NULL,
  address_state TEXT DEFAULT NULL,
  address_zip TEXT DEFAULT NULL,
  address_country TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  instagram TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, email)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can upsert clients" ON public.clients
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Photographers can read own clients" ON public.clients
  FOR SELECT TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Photographers can update own clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Anon can update clients" ON public.clients
  FOR UPDATE TO anon
  USING (true);
