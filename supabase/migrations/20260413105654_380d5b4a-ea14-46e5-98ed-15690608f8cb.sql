-- C1: Drop dangerous anon UPDATE on clients
DROP POLICY IF EXISTS "Anon can update clients" ON public.clients;

-- C4: Drop open anon SELECT on support_messages
DROP POLICY IF EXISTS "Anyone can read support messages" ON public.support_messages;

-- H3: Drop anon INSERT on notifications
DROP POLICY IF EXISTS "Anon can insert notifications" ON public.notifications;

-- M1: Drop anon SELECT on invoice items
DROP POLICY IF EXISTS "Anyone can read invoice items" ON public.booking_invoice_items;

-- C6: Remove sensitive tables from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.support_messages;
  END IF;
END $$;