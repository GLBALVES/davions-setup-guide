
ALTER TABLE public.galleries 
  ADD COLUMN IF NOT EXISTS last_download_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS gallery_kind text;

CREATE TABLE IF NOT EXISTS public.workflow_email_dispatched (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  project_id uuid,
  booking_id uuid,
  gallery_id uuid,
  trigger text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipient_email text
);

CREATE UNIQUE INDEX IF NOT EXISTS workflow_email_dispatched_unique
  ON public.workflow_email_dispatched (
    photographer_id,
    trigger,
    COALESCE(project_id::text, ''),
    COALESCE(booking_id::text, ''),
    COALESCE(gallery_id::text, '')
  );

ALTER TABLE public.workflow_email_dispatched ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photographers_select_dispatched" ON public.workflow_email_dispatched;
CREATE POLICY "photographers_select_dispatched"
  ON public.workflow_email_dispatched FOR SELECT
  USING (photographer_id = public.get_my_photographer_id());

DROP POLICY IF EXISTS "service_all_dispatched" ON public.workflow_email_dispatched;
CREATE POLICY "service_all_dispatched"
  ON public.workflow_email_dispatched FOR ALL
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_workflow_email_dispatched_lookup
  ON public.workflow_email_dispatched (photographer_id, trigger, project_id);
