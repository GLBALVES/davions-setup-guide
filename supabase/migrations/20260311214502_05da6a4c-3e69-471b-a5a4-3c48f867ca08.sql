
-- Table: client_projects (Kanban for tracking client session stages)
CREATE TABLE public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  client_email text,
  session_type text,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  stage text NOT NULL DEFAULT 'lead',
  -- stages: lead | briefing | shooting | editing | delivery | done
  notes text,
  shoot_date date,
  color text DEFAULT '#6366f1',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own client projects"
  ON public.client_projects FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
