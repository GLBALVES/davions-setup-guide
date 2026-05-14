CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL,
  currency TEXT NOT NULL,
  price_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  display TEXT NOT NULL,
  transaction_fee_percent NUMERIC NOT NULL DEFAULT 5,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_key, currency)
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans readable by everyone"
  ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Admins manage plans"
  ON public.subscription_plans FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.subscription_plans (plan_key, currency, price_id, amount, display, sort_order) VALUES
  ('starter','USD','price_1TA8dwHHNUkUYwCFqxyHaXwX',29,'$29',10),
  ('starter','BRL','price_1TCIusHHNUkUYwCFhGtLRSMG',59,'R$59',11),
  ('starter','MXN','price_1TCIwDHHNUkUYwCFJ0k9SNVO',15,'MX$15',12),
  ('pro','USD','price_1TA8iRHHNUkUYwCFWoTJx7FD',69,'$69',20),
  ('pro','BRL','price_1TCIvJHHNUkUYwCFaxbbfmYw',149,'R$149',21),
  ('pro','MXN','price_1TCIwdHHNUkUYwCFDe0bc1LR',35,'MX$35',22),
  ('studio','USD','price_1TA8j8HHNUkUYwCFxFY4uY1U',129,'$129',30),
  ('studio','BRL','price_1TCIvhHHNUkUYwCFIe4qEyU6',279,'R$279',31),
  ('studio','MXN','price_1TCIx7HHNUkUYwCFkTcWOYnb',65,'MX$65',32);