ALTER TABLE public.photographers ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved';

-- Set all existing users as approved
UPDATE public.photographers SET approval_status = 'approved' WHERE approval_status != 'approved';

-- Update handle_new_user to set new users as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members
    WHERE email = NEW.email AND status = 'active'
  ) THEN
    INSERT INTO public.photographers (id, email, full_name, approval_status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      'pending'
    );
  END IF;
  RETURN NEW;
END;
$function$;