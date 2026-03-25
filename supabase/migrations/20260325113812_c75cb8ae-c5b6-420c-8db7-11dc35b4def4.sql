
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on created_at order per photographer
UPDATE public.sessions s
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY photographer_id ORDER BY created_at ASC) - 1 AS rn
  FROM public.sessions
) sub
WHERE s.id = sub.id;
