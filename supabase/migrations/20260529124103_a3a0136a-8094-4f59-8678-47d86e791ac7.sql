-- Allow service_role full access to ssl_alert_state (used by edge functions only)
CREATE POLICY "Service role full access to ssl_alert_state"
ON public.ssl_alert_state
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON public.ssl_alert_state TO service_role;