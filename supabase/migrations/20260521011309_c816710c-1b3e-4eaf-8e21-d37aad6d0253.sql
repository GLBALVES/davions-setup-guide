ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS followup_months integer,
  ADD COLUMN IF NOT EXISTS followup_template_id text;