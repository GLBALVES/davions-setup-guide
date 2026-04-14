
ALTER TABLE public.galleries
ADD COLUMN project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL DEFAULT NULL;

CREATE INDEX idx_galleries_project_id ON public.galleries(project_id);
