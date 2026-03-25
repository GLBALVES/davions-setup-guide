-- Change gallery_deadline from date to text to support "yyyy-MM-dd HH:mm" format
ALTER TABLE public.client_projects 
  ALTER COLUMN gallery_deadline TYPE TEXT USING gallery_deadline::text;