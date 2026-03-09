
-- Add gallery_name column (plugin uses gallery_name, not title)
-- Actually title already exists, let's just add a note. The edge functions will map gallery_name → title.
-- No schema change needed, just confirming current schema is compatible.
SELECT 1;
