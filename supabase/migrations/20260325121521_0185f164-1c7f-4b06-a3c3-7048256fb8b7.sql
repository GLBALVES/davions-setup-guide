ALTER TABLE public.sessions 
  ADD COLUMN IF NOT EXISTS session_model TEXT NOT NULL DEFAULT 'standard' CHECK (session_model IN ('standard', 'campaign')),
  ADD COLUMN IF NOT EXISTS campaign_dates DATE[] DEFAULT NULL;