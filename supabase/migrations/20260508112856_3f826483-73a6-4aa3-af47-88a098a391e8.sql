CREATE TABLE public.project_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.workflow_projects(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_payments_project ON public.project_payments(project_id);
CREATE INDEX idx_project_payments_photographer ON public.project_payments(photographer_id);

ALTER TABLE public.project_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can view their project payments"
  ON public.project_payments FOR SELECT
  USING (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Photographers can insert their project payments"
  ON public.project_payments FOR INSERT
  WITH CHECK (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Photographers can update their project payments"
  ON public.project_payments FOR UPDATE
  USING (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Photographers can delete their project payments"
  ON public.project_payments FOR DELETE
  USING (photographer_id = public.get_my_photographer_id());

CREATE TRIGGER update_project_payments_updated_at
  BEFORE UPDATE ON public.project_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();