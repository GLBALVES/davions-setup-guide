
ALTER TABLE public.workflow_email_templates
  ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS from_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delay_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bcc_email text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.workflow_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  template_id uuid,
  stage_trigger text NOT NULL,
  project_id uuid,
  recipient_email text NOT NULL,
  recipient_name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'sent',
  is_test boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_email_logs_photographer ON public.workflow_email_logs(photographer_id, created_at DESC);

ALTER TABLE public.workflow_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photographers can read own workflow email logs" ON public.workflow_email_logs;
CREATE POLICY "Photographers can read own workflow email logs"
  ON public.workflow_email_logs FOR SELECT TO authenticated
  USING (photographer_id = get_my_photographer_id());

DROP POLICY IF EXISTS "Photographers can insert own workflow email logs" ON public.workflow_email_logs;
CREATE POLICY "Photographers can insert own workflow email logs"
  ON public.workflow_email_logs FOR INSERT TO authenticated
  WITH CHECK (photographer_id = get_my_photographer_id());
