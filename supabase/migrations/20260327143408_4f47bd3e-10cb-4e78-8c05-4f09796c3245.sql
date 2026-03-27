
-- Notifications table for in-app notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  event text NOT NULL DEFAULT 'general',
  metadata jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  event text NOT NULL,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT true,
  browser_push boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(photographer_id, event)
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Photographers can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Photographers can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (photographer_id = get_my_photographer_id());

CREATE POLICY "Service can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (photographer_id = get_my_photographer_id());

CREATE POLICY "Anon can insert notifications"
  ON public.notifications FOR INSERT TO anon
  WITH CHECK (true);

-- RLS policies for notification_preferences
CREATE POLICY "Photographers can CRUD own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (photographer_id = get_my_photographer_id())
  WITH CHECK (photographer_id = get_my_photographer_id());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Index for fast queries
CREATE INDEX idx_notifications_photographer_read ON public.notifications(photographer_id, read, created_at DESC);
