
-- Create session_types table
CREATE TABLE public.session_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_types ENABLE ROW LEVEL SECURITY;

-- Photographers can CRUD their own session types
CREATE POLICY "Photographers can CRUD own session types"
  ON public.session_types
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Add session_type_id to sessions table
ALTER TABLE public.sessions
  ADD COLUMN session_type_id uuid REFERENCES public.session_types(id) ON DELETE SET NULL;
