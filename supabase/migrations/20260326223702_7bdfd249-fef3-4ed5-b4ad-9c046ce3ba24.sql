
CREATE TABLE public.project_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL,
  client_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.project_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project emails"
  ON public.project_emails FOR SELECT TO authenticated
  USING (photographer_id = (SELECT public.get_my_photographer_id()));

CREATE POLICY "Users can insert own project emails"
  ON public.project_emails FOR INSERT TO authenticated
  WITH CHECK (photographer_id = (SELECT public.get_my_photographer_id()));
