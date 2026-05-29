
-- Accounts Payable module
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL,
  description TEXT NOT NULL,
  supplier TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  due_date DATE,
  paid_at DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_photographer ON public.expenses(photographer_id);
CREATE INDEX idx_expenses_status ON public.expenses(photographer_id, status);
CREATE INDEX idx_expenses_due_date ON public.expenses(photographer_id, due_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can view own expenses"
ON public.expenses FOR SELECT TO authenticated
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can insert own expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can update own expenses"
ON public.expenses FOR UPDATE TO authenticated
USING (auth.uid() = photographer_id);

CREATE POLICY "Photographers can delete own expenses"
ON public.expenses FOR DELETE TO authenticated
USING (auth.uid() = photographer_id);

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
