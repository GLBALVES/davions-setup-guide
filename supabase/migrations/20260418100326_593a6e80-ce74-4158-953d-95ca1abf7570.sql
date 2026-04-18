DELETE FROM public.site_pages WHERE photographer_id = '5a5d5450-c7a3-4e3d-9a31-bd5098ec1765';

UPDATE public.photographer_site
SET site_pages_initialized = false
WHERE photographer_id = '5a5d5450-c7a3-4e3d-9a31-bd5098ec1765';