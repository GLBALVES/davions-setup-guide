
-- Fix slugify function search_path
CREATE OR REPLACE FUNCTION public.slugify(input text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(trim(input), 'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
                    'aaaaaaeeeeiiiioooooouuuuyncaaaaaaaeeeeiiiiooooouuuuync'),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END;
$function$;

-- Drop remaining overly permissive anon policies

-- C3: Anon can read ALL briefing responses
DROP POLICY IF EXISTS "Anyone can read own briefing responses" ON public.booking_briefing_responses;

-- Anon can insert clients without scoping
DROP POLICY IF EXISTS "Anyone can upsert clients" ON public.clients;
