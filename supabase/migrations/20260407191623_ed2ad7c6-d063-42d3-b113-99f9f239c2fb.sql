-- Invoice items: free-form items a photographer can add to a booking invoice
CREATE TABLE public.booking_invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  photographer_id UUID NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_invoice_items ENABLE ROW LEVEL SECURITY;

-- Photographers can CRUD their own invoice items
CREATE POLICY "Photographers can CRUD own invoice items"
  ON public.booking_invoice_items
  FOR ALL
  TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- Anon can read invoice items (for client confirmation page)
CREATE POLICY "Anyone can read invoice items"
  ON public.booking_invoice_items
  FOR SELECT
  TO anon
  USING (true);