ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS recurrence_count integer;

ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_recurrence_count_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_recurrence_count_check
CHECK (recurrence_count IS NULL OR recurrence_count >= 1);