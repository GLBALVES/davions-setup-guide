
CREATE TABLE public.help_assistant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC NOT NULL DEFAULT 0.5,
  system_prompt TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.help_assistant_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage help assistant config"
  ON public.help_assistant_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can read help assistant config"
  ON public.help_assistant_config
  FOR SELECT
  TO anon, authenticated
  USING (true);
