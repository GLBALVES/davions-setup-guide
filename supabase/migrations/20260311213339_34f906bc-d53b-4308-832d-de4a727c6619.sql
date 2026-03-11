
-- Studio Roles table
CREATE TABLE public.studio_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own studio roles"
  ON public.studio_roles
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Studio Members table
CREATE TABLE public.studio_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role_id uuid REFERENCES public.studio_roles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  invited_at timestamp with time zone NOT NULL DEFAULT now(),
  joined_at timestamp with time zone
);

ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own studio members"
  ON public.studio_members
  FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
