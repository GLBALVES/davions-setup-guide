CREATE OR REPLACE FUNCTION public.sync_project_stage_from_final_gallery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.project_id IS NOT NULL AND lower(COALESCE(NEW.category, '')) = 'final' THEN
    UPDATE public.client_projects
      SET stage = 'final_gallery',
          updated_at = now()
      WHERE id = NEW.project_id
        AND stage IS DISTINCT FROM 'final_gallery'
        AND stage IS DISTINCT FROM 'archived';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_project_stage_from_final_gallery ON public.galleries;
CREATE TRIGGER trg_sync_project_stage_from_final_gallery
AFTER INSERT OR UPDATE OF project_id, category, status ON public.galleries
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_stage_from_final_gallery();