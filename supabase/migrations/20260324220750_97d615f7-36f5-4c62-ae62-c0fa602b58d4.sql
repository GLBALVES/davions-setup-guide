CREATE TABLE public.ssl_alert_state (
  domain      text PRIMARY KEY,
  bucket      text NOT NULL,
  expires_at  text,
  notified_at timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);