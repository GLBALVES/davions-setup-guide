
-- =============================================
-- WORKFLOW PROJECTS
-- =============================================
CREATE TABLE public.workflow_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text,
  color text NOT NULL DEFAULT '#6366f1',
  icon text NOT NULL DEFAULT 'folder',
  owner_id uuid NOT NULL,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow projects"
  ON public.workflow_projects FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_workflow_projects_updated_at
  BEFORE UPDATE ON public.workflow_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- WORKFLOW SECTIONS
-- =============================================
CREATE TABLE public.workflow_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.workflow_projects(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow sections"
  ON public.workflow_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_projects p WHERE p.id = workflow_sections.project_id AND p.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_projects p WHERE p.id = workflow_sections.project_id AND p.photographer_id = auth.uid()));

-- =============================================
-- WORKFLOW TASKS
-- =============================================
CREATE TABLE public.workflow_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.workflow_projects(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.workflow_sections(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text,
  assignee_id text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  department text,
  position integer NOT NULL DEFAULT 0,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow tasks"
  ON public.workflow_tasks FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER update_workflow_tasks_updated_at
  BEFORE UPDATE ON public.workflow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- WORKFLOW COMMENTS
-- =============================================
CREATE TABLE public.workflow_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow comments"
  ON public.workflow_comments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.id = workflow_comments.task_id AND t.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.id = workflow_comments.task_id AND t.photographer_id = auth.uid()));

-- =============================================
-- WORKFLOW ACTIVITY
-- =============================================
CREATE TABLE public.workflow_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.workflow_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL DEFAULT '',
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow activity"
  ON public.workflow_activity FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.id = workflow_activity.task_id AND t.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_tasks t WHERE t.id = workflow_activity.task_id AND t.photographer_id = auth.uid()));

-- =============================================
-- WORKFLOW MEMBERS
-- =============================================
CREATE TABLE public.workflow_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.workflow_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own workflow members"
  ON public.workflow_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workflow_projects p WHERE p.id = workflow_members.project_id AND p.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.workflow_projects p WHERE p.id = workflow_members.project_id AND p.photographer_id = auth.uid()));

-- =============================================
-- RECURRING TASKS
-- =============================================
CREATE TABLE public.recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  department text,
  owner_name text,
  notes text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  state text NOT NULL DEFAULT 'draft',
  started_at timestamptz,
  estimated_minutes integer DEFAULT 0,
  schedule_freq text NOT NULL DEFAULT 'daily',
  schedule_interval integer NOT NULL DEFAULT 1,
  schedule_days_of_week integer[] DEFAULT '{}',
  schedule_day_of_month integer DEFAULT 1,
  avoid_weekends boolean NOT NULL DEFAULT false,
  weekend_policy text NOT NULL DEFAULT 'next_business_day',
  enabled boolean NOT NULL DEFAULT true,
  repeat_count integer,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

ALTER TABLE public.recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own recurring tasks"
  ON public.recurring_tasks FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- =============================================
-- TASK OCCURRENCES
-- =============================================
CREATE TABLE public.task_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_task_id uuid NOT NULL REFERENCES public.recurring_tasks(id) ON DELETE CASCADE,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  actual_minutes integer,
  completion_notes text,
  late_by_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(recurring_task_id, due_date)
);

ALTER TABLE public.task_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own task occurrences"
  ON public.task_occurrences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recurring_tasks rt WHERE rt.id = task_occurrences.recurring_task_id AND rt.photographer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recurring_tasks rt WHERE rt.id = task_occurrences.recurring_task_id AND rt.photographer_id = auth.uid()));

-- =============================================
-- AI AGENTS
-- =============================================
CREATE TABLE public.ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  slug text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'support',
  system_prompt text NOT NULL DEFAULT '',
  knowledge_base jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature numeric NOT NULL DEFAULT 0.7,
  enabled boolean NOT NULL DEFAULT true,
  auto_reply boolean NOT NULL DEFAULT true,
  review_mode boolean NOT NULL DEFAULT false,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photographer_id, slug)
);

ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own ai agents"
  ON public.ai_agents FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
