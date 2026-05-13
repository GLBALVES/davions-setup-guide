CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_external_uniq
ON public.webhook_events (provider, event_type, external_id)
WHERE external_id IS NOT NULL AND event_type IS NOT NULL;