CREATE TABLE IF NOT EXISTS public.followup_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_followup_email_templates_photographer
  ON public.followup_email_templates(photographer_id);

ALTER TABLE public.followup_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view followup templates"
  ON public.followup_email_templates FOR SELECT
  USING (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Owners can insert followup templates"
  ON public.followup_email_templates FOR INSERT
  WITH CHECK (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Owners can update followup templates"
  ON public.followup_email_templates FOR UPDATE
  USING (photographer_id = public.get_my_photographer_id());

CREATE POLICY "Owners can delete followup templates"
  ON public.followup_email_templates FOR DELETE
  USING (photographer_id = public.get_my_photographer_id());

CREATE TRIGGER trg_followup_email_templates_updated_at
  BEFORE UPDATE ON public.followup_email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();