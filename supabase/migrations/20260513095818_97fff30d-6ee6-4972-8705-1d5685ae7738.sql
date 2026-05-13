CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text,
  external_id text,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  payload jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_provider ON public.webhook_events (provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events (status, created_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE POLICY "Admins can view webhook events"
      ON public.webhook_events
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;