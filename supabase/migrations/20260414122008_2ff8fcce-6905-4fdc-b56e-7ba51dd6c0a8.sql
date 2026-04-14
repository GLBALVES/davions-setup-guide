
CREATE TABLE public.workflow_email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  stage_trigger TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  html_content TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  auto_send BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (photographer_id, stage_trigger)
);

ALTER TABLE public.workflow_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow_email_templates"
  ON public.workflow_email_templates
  FOR ALL
  TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

CREATE TRIGGER update_workflow_email_templates_updated_at
  BEFORE UPDATE ON public.workflow_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
