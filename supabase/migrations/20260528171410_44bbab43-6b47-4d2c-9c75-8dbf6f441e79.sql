-- 1) photo_favorites: remove unsafe anon DELETE policy and provide a token-validated RPC
DROP POLICY IF EXISTS "Clients can delete own favorites by token" ON public.photo_favorites;

CREATE OR REPLACE FUNCTION public.delete_gallery_favorite_by_token(
  _gallery_id uuid,
  _photo_id uuid,
  _client_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _client_token IS NULL OR length(_client_token) < 16 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.galleries g
    WHERE g.id = _gallery_id AND g.status = 'published'
  ) THEN
    RAISE EXCEPTION 'gallery not available';
  END IF;

  DELETE FROM public.photo_favorites
   WHERE gallery_id = _gallery_id
     AND photo_id = _photo_id
     AND client_token = _client_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_gallery_favorite_by_token(uuid, uuid, text) TO anon, authenticated;

-- 2) support_messages: remove unrestricted anon INSERT policy
DROP POLICY IF EXISTS "Anyone can insert support messages" ON public.support_messages;
