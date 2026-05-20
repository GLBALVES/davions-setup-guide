CREATE OR REPLACE FUNCTION public.set_post_production_started_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage = 'post_production' AND (OLD.stage IS DISTINCT FROM 'post_production') THEN
    NEW.post_production_started_at := now();
  ELSIF OLD.stage = 'post_production' AND NEW.stage IS DISTINCT FROM 'post_production' THEN
    NEW.post_production_started_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_post_production_started_at ON public.client_projects;
CREATE TRIGGER trg_set_post_production_started_at
BEFORE UPDATE OF stage ON public.client_projects
FOR EACH ROW
EXECUTE FUNCTION public.set_post_production_started_at();