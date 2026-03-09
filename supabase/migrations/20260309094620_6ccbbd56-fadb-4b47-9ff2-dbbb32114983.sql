
ALTER TABLE public.galleries
ADD COLUMN category text NOT NULL DEFAULT 'proof'
CONSTRAINT galleries_category_check CHECK (category IN ('proof', 'final'));

COMMENT ON COLUMN public.galleries.category IS 'proof = galeria de prova (seleção), final = galeria final (download)';
