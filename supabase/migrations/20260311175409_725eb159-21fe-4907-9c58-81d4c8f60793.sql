
-- Enable realtime for bookings and sessions tables so sidebar badges update instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
