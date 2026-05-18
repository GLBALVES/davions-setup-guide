ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS shop_show_filters boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_show_price boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shop_order text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS shop_limit integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'photographer_site_shop_order_check'
      AND conrelid = 'public.photographer_site'::regclass
  ) THEN
    ALTER TABLE public.photographer_site
      ADD CONSTRAINT photographer_site_shop_order_check
      CHECK (shop_order IN ('manual', 'price-asc', 'price-desc'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'photographer_site_shop_limit_nonnegative_check'
      AND conrelid = 'public.photographer_site'::regclass
  ) THEN
    ALTER TABLE public.photographer_site
      ADD CONSTRAINT photographer_site_shop_limit_nonnegative_check
      CHECK (shop_limit >= 0);
  END IF;
END $$;