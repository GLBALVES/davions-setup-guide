
-- Add slug column to sessions (nullable, unique, for existing rows keep null initially)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Function to generate a URL-friendly slug from a title
CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
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
$$;
