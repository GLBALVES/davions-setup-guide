
CREATE TABLE public.bug_report_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bug_report_id uuid NOT NULL REFERENCES public.bug_reports(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_email text NOT NULL DEFAULT '',
  is_admin boolean NOT NULL DEFAULT false,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_report_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all bug messages"
  ON public.bug_report_messages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reporters can insert messages on own reports"
  ON public.bug_report_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bug_reports br
      WHERE br.id = bug_report_id AND br.reporter_id = auth.uid()
    )
  );

CREATE POLICY "Reporters can read messages on own reports"
  ON public.bug_report_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bug_reports br
      WHERE br.id = bug_report_id AND br.reporter_id = auth.uid()
    )
  );
