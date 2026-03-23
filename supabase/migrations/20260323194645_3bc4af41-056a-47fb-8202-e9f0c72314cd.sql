
-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documents', 'project-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload project documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents');

CREATE POLICY "Public read access for project documents"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'project-documents');

CREATE POLICY "Owners can delete their project documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create project_documents table
CREATE TABLE public.project_documents (
  id              uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id      uuid NOT NULL,
  photographer_id uuid NOT NULL,
  name            text NOT NULL DEFAULT '',
  file_url        text NOT NULL DEFAULT '',
  storage_path    text NOT NULL DEFAULT '',
  file_type       text NOT NULL DEFAULT '',
  file_size       bigint NOT NULL DEFAULT 0,
  category        text NOT NULL DEFAULT 'other',
  created_at      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_documents_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.client_projects(id) ON DELETE CASCADE,
  CONSTRAINT project_documents_photographer_id_fkey
    FOREIGN KEY (photographer_id) REFERENCES public.photographers(id) ON DELETE CASCADE
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own project documents"
  ON public.project_documents FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

CREATE INDEX idx_project_documents_project_id ON public.project_documents(project_id);
CREATE INDEX idx_project_documents_photographer_id ON public.project_documents(photographer_id);
