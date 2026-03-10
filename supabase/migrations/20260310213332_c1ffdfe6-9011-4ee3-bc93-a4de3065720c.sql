
-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photographer_id UUID NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL DEFAULT '',
  client_email TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  ai_mode TEXT NOT NULL DEFAULT 'manual',
  rating INTEGER,
  rating_comment TEXT,
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own support tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

-- Allow anon to create tickets (client-facing)
CREATE POLICY "Anyone can create support tickets"
  ON public.support_tickets FOR INSERT TO anon
  WITH CHECK (true);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user',
  content TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own support messages"
  ON public.support_messages FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id AND t.photographer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id AND t.photographer_id = auth.uid()
  ));

-- Allow anon to insert messages (client sends)
CREATE POLICY "Anyone can insert support messages"
  ON public.support_messages FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to read messages for their ticket
CREATE POLICY "Anyone can read support messages"
  ON public.support_messages FOR SELECT TO anon
  USING (true);

-- Enable realtime on support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Create chat-attachments storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Storage RLS for chat-attachments
CREATE POLICY "Anyone can upload chat attachments"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'chat-attachments');

CREATE POLICY "Anyone can read chat attachments"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-attachments');

-- Updated at trigger for support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
