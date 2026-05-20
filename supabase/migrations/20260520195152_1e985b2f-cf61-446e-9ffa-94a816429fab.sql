
CREATE OR REPLACE FUNCTION public.set_gallery_cover_from_first_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cover text;
  v_url text;
BEGIN
  IF NEW.storage_path IS NULL OR NEW.gallery_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT cover_image_url INTO v_cover FROM public.galleries WHERE id = NEW.gallery_id;

  IF v_cover IS NULL OR v_cover = '' THEN
    v_url := 'https://pjcegphrngpedujeatrl.supabase.co/storage/v1/object/public/gallery-photos/' || NEW.storage_path;
    UPDATE public.galleries
      SET cover_image_url = v_url,
          cover_focal_x = COALESCE(cover_focal_x, 50),
          cover_focal_y = COALESCE(cover_focal_y, 50)
      WHERE id = NEW.gallery_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_gallery_cover_from_first_photo ON public.photos;
CREATE TRIGGER trg_set_gallery_cover_from_first_photo
AFTER INSERT ON public.photos
FOR EACH ROW
EXECUTE FUNCTION public.set_gallery_cover_from_first_photo();
