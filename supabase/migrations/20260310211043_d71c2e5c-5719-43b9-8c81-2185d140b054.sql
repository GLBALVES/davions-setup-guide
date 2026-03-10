
-- Email Campaigns (drip sequences)
CREATE TABLE public.mkt_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  html_content text,
  status text NOT NULL DEFAULT 'draft',
  audience jsonb DEFAULT '{"type":"all"}'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mkt_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own email campaigns"
  ON public.mkt_email_campaigns FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER set_updated_at_mkt_email_campaigns
  BEFORE UPDATE ON public.mkt_email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign sequence emails
CREATE TABLE public.mkt_email_campaign_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.mkt_email_campaigns(id) ON DELETE CASCADE,
  email_order integer NOT NULL DEFAULT 1,
  subject text NOT NULL DEFAULT '',
  html_content text,
  delay_days integer NOT NULL DEFAULT 0,
  send_time time DEFAULT '09:00',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mkt_email_campaign_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own campaign emails"
  ON public.mkt_email_campaign_emails FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.mkt_email_campaigns c
    WHERE c.id = mkt_email_campaign_emails.campaign_id
    AND c.photographer_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.mkt_email_campaigns c
    WHERE c.id = mkt_email_campaign_emails.campaign_id
    AND c.photographer_id = auth.uid()
  ));

-- Automated (trigger-based) emails
CREATE TABLE public.mkt_email_automated (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  trigger_type text NOT NULL DEFAULT 'signup',
  trigger_config jsonb DEFAULT '{}'::jsonb,
  subject text NOT NULL DEFAULT '',
  html_content text,
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mkt_email_automated ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own automated emails"
  ON public.mkt_email_automated FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER set_updated_at_mkt_email_automated
  BEFORE UPDATE ON public.mkt_email_automated
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- One-off (scheduled) emails
CREATE TABLE public.mkt_email_oneoff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  html_content text,
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  audience jsonb DEFAULT '{"type":"all"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mkt_email_oneoff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own oneoff emails"
  ON public.mkt_email_oneoff FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());

CREATE TRIGGER set_updated_at_mkt_email_oneoff
  BEFORE UPDATE ON public.mkt_email_oneoff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Push Notifications
CREATE TABLE public.mkt_push_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photographer_id uuid NOT NULL REFERENCES public.photographers(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  image_url text,
  action_url text,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  audience jsonb DEFAULT '{"type":"all"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mkt_push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photographers can CRUD own push notifications"
  ON public.mkt_push_notifications FOR ALL
  TO authenticated
  USING (photographer_id = auth.uid())
  WITH CHECK (photographer_id = auth.uid());
