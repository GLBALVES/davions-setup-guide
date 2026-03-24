CREATE TABLE IF NOT EXISTS public.ssl_email_bounces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  event TEXT NOT NULL,
  domain TEXT,
  message_id TEXT,
  reason TEXT,
  brevo_event_at TIMESTAMP WITH TIME ZONE,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ssl_email_bounces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all ssl email bounces"
  ON public.ssl_email_bounces
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert ssl email bounces"
  ON public.ssl_email_bounces
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ssl_email_bounces_email ON public.ssl_email_bounces (email);
CREATE INDEX IF NOT EXISTS idx_ssl_email_bounces_created_at ON public.ssl_email_bounces (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ssl_email_bounces_domain ON public.ssl_email_bounces (domain);