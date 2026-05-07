
ALTER TABLE public.contract_custom_fields
  ADD COLUMN IF NOT EXISTS value_source TEXT NOT NULL DEFAULT 'static',
  ADD COLUMN IF NOT EXISTS mapped_key TEXT,
  ADD COLUMN IF NOT EXISTS client_prompt TEXT,
  ADD COLUMN IF NOT EXISTS client_input_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.booking_custom_field_values (
  booking_id UUID NOT NULL,
  field_key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (booking_id, field_key)
);

ALTER TABLE public.booking_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can view own booking custom values"
ON public.booking_custom_field_values
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_custom_field_values.booking_id
      AND b.photographer_id = public.get_my_photographer_id()
  )
);

CREATE POLICY "Anyone can insert booking custom values"
ON public.booking_custom_field_values
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update booking custom values"
ON public.booking_custom_field_values
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_booking_custom_field_values_updated_at
BEFORE UPDATE ON public.booking_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
