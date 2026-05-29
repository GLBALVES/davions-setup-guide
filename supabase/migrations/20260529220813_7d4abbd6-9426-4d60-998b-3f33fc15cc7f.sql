ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS recurrence_interval text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS recurrence_until date;

ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_recurrence_interval_check;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_recurrence_interval_check
CHECK (recurrence_interval IN ('none','weekly','monthly','quarterly','yearly'));