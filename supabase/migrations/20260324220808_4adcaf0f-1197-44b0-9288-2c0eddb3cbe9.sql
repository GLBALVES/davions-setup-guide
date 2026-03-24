-- Enable RLS on ssl_alert_state but allow no public access (service role only)
ALTER TABLE public.ssl_alert_state ENABLE ROW LEVEL SECURITY;