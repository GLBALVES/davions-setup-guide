
CREATE TABLE public.project_invoices (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      uuid NOT NULL,
  photographer_id uuid NOT NULL,
  description     text NOT NULL DEFAULT '',
  amount          numeric(10, 2) NOT NULL DEFAULT 0,
  status          text NOT NULL DEFAULT 'pending',
  due_date        date,
  paid_at         timestamp with time zone,
  paid_amount     numeric(10, 2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  updated_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_invoices_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE,
  CONSTRAINT project_invoices_photographer_id_fkey
    FOREIGN KEY (photographer_id) REFERENCES public.photographers(id) ON DELETE CASCADE
);

ALTER TABLE public.project_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own project invoices"
  ON public.project_invoices FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

CREATE TRIGGER update_project_invoices_updated_at
  BEFORE UPDATE ON public.project_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_project_invoices_project_id ON public.project_invoices(project_id);
CREATE INDEX idx_project_invoices_photographer_id ON public.project_invoices(photographer_id);
