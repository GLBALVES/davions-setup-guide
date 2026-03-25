
ALTER TABLE public.galleries ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Initialize sort_order based on created_at order per photographer
UPDATE public.galleries g
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY photographer_id ORDER BY created_at DESC) - 1 AS rn
  FROM public.galleries
) sub
WHERE g.id = sub.id;
