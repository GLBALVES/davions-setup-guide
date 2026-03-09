
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS confirmation_email_body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reminder_days integer[] NOT NULL DEFAULT '{}';
