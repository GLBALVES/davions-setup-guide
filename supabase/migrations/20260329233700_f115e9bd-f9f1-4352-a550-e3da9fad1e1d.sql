
-- Table: email_documents
CREATE TABLE public.email_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email_id uuid NOT NULL,
  sender_email text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_url text,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  file_size bigint NOT NULL DEFAULT 0,
  saved boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own email_documents"
  ON public.email_documents FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table: email_document_settings
CREATE TABLE public.email_document_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE,
  auto_save boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_document_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own email_document_settings"
  ON public.email_document_settings FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for email documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('email-documents', 'email-documents', false);

-- Storage RLS policies
CREATE POLICY "Users can upload own email documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'email-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own email documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'email-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own email documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'email-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
