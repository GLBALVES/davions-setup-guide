
-- ============================================================
-- STEP 1: Create get_my_photographer_id() resolver function
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_photographer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT sm.photographer_id
      FROM public.studio_members sm
      WHERE sm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND sm.status = 'active'
      LIMIT 1
    ),
    auth.uid()
  );
$$;

-- ============================================================
-- STEP 2: Fix handle_new_user trigger — skip phantom rows for
--         users who are already active studio members
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.studio_members
    WHERE email = NEW.email AND status = 'active'
  ) THEN
    INSERT INTO public.photographers (id, email, full_name)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 3: Clean up phantom photographers rows for existing
--         studio members (users who signed up before the fix)
-- ============================================================
DELETE FROM public.photographers p
WHERE EXISTS (
  SELECT 1
  FROM public.studio_members sm
  JOIN auth.users u ON lower(u.email) = lower(sm.email)
  WHERE u.id = p.id
    AND sm.status = 'active'
)
AND NOT EXISTS (
  SELECT 1 FROM public.studio_members WHERE photographer_id = p.id
);

-- ============================================================
-- STEP 4: Update RLS policies on all business tables
-- ============================================================

-- ── sessions ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own sessions" ON public.sessions;
CREATE POLICY "Photographers can CRUD own sessions"
ON public.sessions FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── galleries ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own galleries" ON public.galleries;
CREATE POLICY "Photographers can CRUD own galleries"
ON public.galleries FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── photos ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own photos" ON public.photos;
CREATE POLICY "Photographers can CRUD own photos"
ON public.photos FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── bookings ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can read own bookings" ON public.bookings;
CREATE POLICY "Photographers can read own bookings"
ON public.bookings FOR SELECT TO authenticated
USING (photographer_id = get_my_photographer_id());

DROP POLICY IF EXISTS "Photographers can update own bookings" ON public.bookings;
CREATE POLICY "Photographers can update own bookings"
ON public.bookings FOR UPDATE TO authenticated
USING (photographer_id = get_my_photographer_id());

-- ── session_availability ────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own availability" ON public.session_availability;
CREATE POLICY "Photographers can CRUD own availability"
ON public.session_availability FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── session_day_config ──────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own day configs" ON public.session_day_config;
CREATE POLICY "Photographers can CRUD own day configs"
ON public.session_day_config FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── blocked_times ───────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own blocked times" ON public.blocked_times;
CREATE POLICY "Photographers can CRUD own blocked times"
ON public.blocked_times FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── blog_posts ──────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own blog posts" ON public.blog_posts;
CREATE POLICY "Photographers can CRUD own blog posts"
ON public.blog_posts FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── blog_categories ─────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own blog categories" ON public.blog_categories;
CREATE POLICY "Photographers can CRUD own blog categories"
ON public.blog_categories FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── blog_settings ───────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own blog settings" ON public.blog_settings;
CREATE POLICY "Photographers can CRUD own blog settings"
ON public.blog_settings FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── blog_themes ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own blog themes" ON public.blog_themes;
CREATE POLICY "Photographers can CRUD own blog themes"
ON public.blog_themes FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── brand_assets ────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own brand assets" ON public.brand_assets;
CREATE POLICY "Photographers can CRUD own brand assets"
ON public.brand_assets FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── briefings ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own briefings" ON public.briefings;
CREATE POLICY "Photographers can CRUD own briefings"
ON public.briefings FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── client_projects ─────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own client projects" ON public.client_projects;
CREATE POLICY "Photographers can CRUD own client projects"
ON public.client_projects FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── contracts ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own contracts" ON public.contracts;
CREATE POLICY "Photographers can CRUD own contracts"
ON public.contracts FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── creative_images ─────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own creative images" ON public.creative_images;
CREATE POLICY "Photographers can CRUD own creative images"
ON public.creative_images FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── creative_templates ──────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own creative templates" ON public.creative_templates;
CREATE POLICY "Photographers can CRUD own creative templates"
ON public.creative_templates FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── gallery_settings ────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own gallery settings" ON public.gallery_settings;
CREATE POLICY "Photographers can CRUD own gallery settings"
ON public.gallery_settings FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── help_conversations ──────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own help conversations" ON public.help_conversations;
CREATE POLICY "Photographers can CRUD own help conversations"
ON public.help_conversations FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── mkt_email_automated ─────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own automated emails" ON public.mkt_email_automated;
CREATE POLICY "Photographers can CRUD own automated emails"
ON public.mkt_email_automated FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── mkt_email_campaigns ─────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own email campaigns" ON public.mkt_email_campaigns;
CREATE POLICY "Photographers can CRUD own email campaigns"
ON public.mkt_email_campaigns FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── mkt_email_oneoff ────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own oneoff emails" ON public.mkt_email_oneoff;
CREATE POLICY "Photographers can CRUD own oneoff emails"
ON public.mkt_email_oneoff FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── mkt_push_notifications ──────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own push notifications" ON public.mkt_push_notifications;
CREATE POLICY "Photographers can CRUD own push notifications"
ON public.mkt_push_notifications FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── mkt_social_posts ────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own social posts" ON public.mkt_social_posts;
CREATE POLICY "Photographers can CRUD own social posts"
ON public.mkt_social_posts FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── page_seo_settings ───────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own page seo settings" ON public.page_seo_settings;
CREATE POLICY "Photographers can CRUD own page seo settings"
ON public.page_seo_settings FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── photographer_site ───────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own site settings" ON public.photographer_site;
CREATE POLICY "Photographers can CRUD own site settings"
ON public.photographer_site FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── recurring_tasks ─────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own recurring tasks" ON public.recurring_tasks;
CREATE POLICY "Photographers can CRUD own recurring tasks"
ON public.recurring_tasks FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── ai_agents ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own ai agents" ON public.ai_agents;
CREATE POLICY "Photographers can CRUD own ai agents"
ON public.ai_agents FOR ALL TO authenticated
USING (photographer_id = get_my_photographer_id())
WITH CHECK (photographer_id = get_my_photographer_id());

-- ── analytics_pageviews ─────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can read own pageviews" ON public.analytics_pageviews;
CREATE POLICY "Photographers can read own pageviews"
ON public.analytics_pageviews FOR SELECT TO authenticated
USING (photographer_id = get_my_photographer_id());

-- ── photographers (allow member to read employer profile) ───
DROP POLICY IF EXISTS "Photographers can read own profile" ON public.photographers;
CREATE POLICY "Photographers can read own profile"
ON public.photographers FOR SELECT TO authenticated
USING (id = get_my_photographer_id());

DROP POLICY IF EXISTS "Photographers can update own profile" ON public.photographers;
CREATE POLICY "Photographers can update own profile"
ON public.photographers FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ── booking_briefing_responses ──────────────────────────────
DROP POLICY IF EXISTS "Photographers can read own briefing responses" ON public.booking_briefing_responses;
CREATE POLICY "Photographers can read own briefing responses"
ON public.booking_briefing_responses FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = booking_briefing_responses.booking_id
      AND b.photographer_id = get_my_photographer_id()
  )
);

-- ── help_messages ───────────────────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own help messages" ON public.help_messages;
CREATE POLICY "Photographers can CRUD own help messages"
ON public.help_messages FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.help_conversations c
    WHERE c.id = help_messages.conversation_id
      AND c.photographer_id = get_my_photographer_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.help_conversations c
    WHERE c.id = help_messages.conversation_id
      AND c.photographer_id = get_my_photographer_id()
  )
);

-- ── mkt_email_campaign_emails ───────────────────────────────
DROP POLICY IF EXISTS "Photographers can CRUD own campaign emails" ON public.mkt_email_campaign_emails;
CREATE POLICY "Photographers can CRUD own campaign emails"
ON public.mkt_email_campaign_emails FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mkt_email_campaigns c
    WHERE c.id = mkt_email_campaign_emails.campaign_id
      AND c.photographer_id = get_my_photographer_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mkt_email_campaigns c
    WHERE c.id = mkt_email_campaign_emails.campaign_id
      AND c.photographer_id = get_my_photographer_id()
  )
);
