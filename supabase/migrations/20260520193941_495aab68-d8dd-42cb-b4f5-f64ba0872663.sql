ALTER TABLE public.client_projects ADD COLUMN IF NOT EXISTS post_production_started_at TIMESTAMPTZ;

-- Backfill: for projects already in post_production, use updated_at as a reasonable approximation
UPDATE public.client_projects
SET post_production_started_at = COALESCE(updated_at, created_at)
WHERE stage = 'post_production' AND post_production_started_at IS NULL;

-- Trigger to auto-set timestamp when stage transitions into 'post_production'
CREATE OR REPLACE FUNCTION public.set_post_production_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'post_production' AND (OLD.stage IS DISTINCT FROM 'post_production') THEN
    NEW.post_production_started_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_post_production_started_at ON public.client_projects;
CREATE TRIGGER trg_set_post_production_started_at
BEFORE UPDATE ON public.client_projects
FOR EACH ROW
EXECUTE FUNCTION public.set_post_production_started_at();