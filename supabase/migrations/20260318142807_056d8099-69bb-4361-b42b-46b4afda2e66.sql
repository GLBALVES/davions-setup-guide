
CREATE TABLE public.help_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.help_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.help_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_conversations_photographer ON public.help_conversations(photographer_id, updated_at DESC);
CREATE INDEX idx_help_messages_conversation ON public.help_messages(conversation_id, created_at ASC);

ALTER TABLE public.help_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own help conversations"
  ON public.help_conversations FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE POLICY "Photographers can CRUD own help messages"
  ON public.help_messages FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.help_conversations c
    WHERE c.id = help_messages.conversation_id
      AND c.photographer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.help_conversations c
    WHERE c.id = help_messages.conversation_id
      AND c.photographer_id = auth.uid()
  ));

CREATE TRIGGER update_help_conversations_updated_at
  BEFORE UPDATE ON public.help_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
