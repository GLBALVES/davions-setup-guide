
CREATE OR REPLACE FUNCTION public.has_studio_permission(_photographer_id uuid, _perm text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_photographer_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.studio_members sm
      JOIN public.studio_roles sr ON sr.id = sm.role_id
      WHERE sm.photographer_id = _photographer_id
        AND sm.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND sm.status = 'active'
        AND COALESCE((sr.permissions ->> _perm)::boolean, false) = true
    );
$$;

-- AGENTS
DROP POLICY IF EXISTS "Photographers can CRUD own ai agents" ON public.ai_agents;
CREATE POLICY "Photographers can CRUD own ai agents" ON public.ai_agents
  FOR ALL USING (has_studio_permission(photographer_id, 'agents'))
  WITH CHECK (has_studio_permission(photographer_id, 'agents'));

-- BLOG
DROP POLICY IF EXISTS "Photographers can CRUD own ai_blog_config" ON public.ai_blog_config;
CREATE POLICY "Photographers can CRUD own ai_blog_config" ON public.ai_blog_config
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own ai_blog_images" ON public.ai_blog_images;
CREATE POLICY "Photographers can CRUD own ai_blog_images" ON public.ai_blog_images
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own ai_blog_seo" ON public.ai_blog_seo;
CREATE POLICY "Photographers can CRUD own ai_blog_seo" ON public.ai_blog_seo
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own ai_themes" ON public.ai_themes;
CREATE POLICY "Photographers can CRUD own ai_themes" ON public.ai_themes
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own blog categories" ON public.blog_categories;
CREATE POLICY "Photographers can CRUD own blog categories" ON public.blog_categories
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own blog posts" ON public.blog_posts;
CREATE POLICY "Photographers can CRUD own blog posts" ON public.blog_posts
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own blog settings" ON public.blog_settings;
CREATE POLICY "Photographers can CRUD own blog settings" ON public.blog_settings
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own blog themes" ON public.blog_themes;
CREATE POLICY "Photographers can CRUD own blog themes" ON public.blog_themes
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));
DROP POLICY IF EXISTS "Photographers can CRUD own blogs" ON public.blogs;
CREATE POLICY "Photographers can CRUD own blogs" ON public.blogs
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));

-- SEO
DROP POLICY IF EXISTS "Photographers can read own pageviews" ON public.analytics_pageviews;
CREATE POLICY "Photographers can read own pageviews" ON public.analytics_pageviews
  FOR SELECT USING (has_studio_permission(photographer_id, 'seo'));
DROP POLICY IF EXISTS "Photographers can CRUD own page seo settings" ON public.page_seo_settings;
CREATE POLICY "Photographers can CRUD own page seo settings" ON public.page_seo_settings
  FOR ALL USING (has_studio_permission(photographer_id, 'seo')) WITH CHECK (has_studio_permission(photographer_id, 'seo'));

-- SCHEDULE
DROP POLICY IF EXISTS "Photographers can CRUD own blocked times" ON public.blocked_times;
CREATE POLICY "Photographers can CRUD own blocked times" ON public.blocked_times
  FOR ALL USING (has_studio_permission(photographer_id, 'schedule')) WITH CHECK (has_studio_permission(photographer_id, 'schedule'));

-- BOOKINGS
DROP POLICY IF EXISTS "Photographers can read own briefing responses" ON public.booking_briefing_responses;
CREATE POLICY "Photographers can read own briefing responses" ON public.booking_briefing_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_briefing_responses.booking_id AND has_studio_permission(b.photographer_id, 'bookings')));
DROP POLICY IF EXISTS "Photographers can view own booking custom values" ON public.booking_custom_field_values;
CREATE POLICY "Photographers can view own booking custom values" ON public.booking_custom_field_values
  FOR SELECT USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_custom_field_values.booking_id AND has_studio_permission(b.photographer_id, 'bookings')));
DROP POLICY IF EXISTS "Photographers can CRUD own invoice items" ON public.booking_invoice_items;
CREATE POLICY "Photographers can CRUD own invoice items" ON public.booking_invoice_items
  FOR ALL USING (has_studio_permission(photographer_id, 'finance')) WITH CHECK (has_studio_permission(photographer_id, 'finance'));
DROP POLICY IF EXISTS "Photographers can insert own bookings" ON public.bookings;
CREATE POLICY "Photographers can insert own bookings" ON public.bookings
  FOR INSERT WITH CHECK (has_studio_permission(photographer_id, 'bookings'));
DROP POLICY IF EXISTS "Photographers can read own bookings" ON public.bookings;
CREATE POLICY "Photographers can read own bookings" ON public.bookings
  FOR SELECT USING (has_studio_permission(photographer_id, 'bookings'));
DROP POLICY IF EXISTS "Photographers can update own bookings" ON public.bookings;
CREATE POLICY "Photographers can update own bookings" ON public.bookings
  FOR UPDATE USING (has_studio_permission(photographer_id, 'bookings'));
DROP POLICY IF EXISTS "Photographers can CRUD own briefings" ON public.briefings;
CREATE POLICY "Photographers can CRUD own briefings" ON public.briefings
  FOR ALL USING (has_studio_permission(photographer_id, 'bookings')) WITH CHECK (has_studio_permission(photographer_id, 'bookings'));

-- WEBSITE
DROP POLICY IF EXISTS "Photographers can CRUD own brand assets" ON public.brand_assets;
CREATE POLICY "Photographers can CRUD own brand assets" ON public.brand_assets
  FOR ALL USING (has_studio_permission(photographer_id, 'website')) WITH CHECK (has_studio_permission(photographer_id, 'website'));
DROP POLICY IF EXISTS "Photographers can CRUD own site settings" ON public.photographer_site;
CREATE POLICY "Photographers can CRUD own site settings" ON public.photographer_site
  FOR ALL USING (has_studio_permission(photographer_id, 'website')) WITH CHECK (has_studio_permission(photographer_id, 'website'));
DROP POLICY IF EXISTS "Photographers can CRUD own site pages" ON public.site_pages;
CREATE POLICY "Photographers can CRUD own site pages" ON public.site_pages
  FOR ALL USING (has_studio_permission(photographer_id, 'website')) WITH CHECK (has_studio_permission(photographer_id, 'website'));
DROP POLICY IF EXISTS "Photographers can delete own submissions" ON public.form_submissions;
CREATE POLICY "Photographers can delete own submissions" ON public.form_submissions
  FOR DELETE USING (has_studio_permission(photographer_id, 'website'));
DROP POLICY IF EXISTS "Photographers can read own submissions" ON public.form_submissions;
CREATE POLICY "Photographers can read own submissions" ON public.form_submissions
  FOR SELECT USING (has_studio_permission(photographer_id, 'website'));
DROP POLICY IF EXISTS "Photographers can update own submissions" ON public.form_submissions;
CREATE POLICY "Photographers can update own submissions" ON public.form_submissions
  FOR UPDATE USING (has_studio_permission(photographer_id, 'website'));

-- CREATIVE
DROP POLICY IF EXISTS "Photographers can CRUD own carousel_historico" ON public.carousel_historico;
CREATE POLICY "Photographers can CRUD own carousel_historico" ON public.carousel_historico
  FOR ALL USING (has_studio_permission(photographer_id, 'creative')) WITH CHECK (has_studio_permission(photographer_id, 'creative'));
DROP POLICY IF EXISTS "Photographers can CRUD own carousel_image_library" ON public.carousel_image_library;
CREATE POLICY "Photographers can CRUD own carousel_image_library" ON public.carousel_image_library
  FOR ALL USING (has_studio_permission(photographer_id, 'creative')) WITH CHECK (has_studio_permission(photographer_id, 'creative'));
DROP POLICY IF EXISTS "Photographers can CRUD own carousel_meta_config" ON public.carousel_meta_config;
CREATE POLICY "Photographers can CRUD own carousel_meta_config" ON public.carousel_meta_config
  FOR ALL USING (has_studio_permission(photographer_id, 'creative')) WITH CHECK (has_studio_permission(photographer_id, 'creative'));
DROP POLICY IF EXISTS "Photographers can CRUD own creative images" ON public.creative_images;
CREATE POLICY "Photographers can CRUD own creative images" ON public.creative_images
  FOR ALL USING (has_studio_permission(photographer_id, 'creative')) WITH CHECK (has_studio_permission(photographer_id, 'creative'));
DROP POLICY IF EXISTS "Photographers can CRUD own creative templates" ON public.creative_templates;
CREATE POLICY "Photographers can CRUD own creative templates" ON public.creative_templates
  FOR ALL USING (has_studio_permission(photographer_id, 'creative')) WITH CHECK (has_studio_permission(photographer_id, 'creative'));

-- WORKFLOW
DROP POLICY IF EXISTS "Photographers can CRUD own client projects" ON public.client_projects;
CREATE POLICY "Photographers can CRUD own client projects" ON public.client_projects
  FOR ALL USING (has_studio_permission(photographer_id, 'workflow')) WITH CHECK (has_studio_permission(photographer_id, 'workflow'));
DROP POLICY IF EXISTS "Photographers can CRUD own project documents" ON public.project_documents;
CREATE POLICY "Photographers can CRUD own project documents" ON public.project_documents
  FOR ALL USING (has_studio_permission(photographer_id, 'workflow')) WITH CHECK (has_studio_permission(photographer_id, 'workflow'));
DROP POLICY IF EXISTS "photographers_select_dispatched" ON public.workflow_email_dispatched;
CREATE POLICY "photographers_select_dispatched" ON public.workflow_email_dispatched
  FOR SELECT USING (has_studio_permission(photographer_id, 'workflow'));
DROP POLICY IF EXISTS "Photographers can insert own workflow email logs" ON public.workflow_email_logs;
CREATE POLICY "Photographers can insert own workflow email logs" ON public.workflow_email_logs
  FOR INSERT WITH CHECK (has_studio_permission(photographer_id, 'workflow'));
DROP POLICY IF EXISTS "Photographers can read own workflow email logs" ON public.workflow_email_logs;
CREATE POLICY "Photographers can read own workflow email logs" ON public.workflow_email_logs
  FOR SELECT USING (has_studio_permission(photographer_id, 'workflow'));
DROP POLICY IF EXISTS "Photographers can CRUD own workflow_email_templates" ON public.workflow_email_templates;
CREATE POLICY "Photographers can CRUD own workflow_email_templates" ON public.workflow_email_templates
  FOR ALL USING (has_studio_permission(photographer_id, 'workflow')) WITH CHECK (has_studio_permission(photographer_id, 'workflow'));

-- CLIENTS
DROP POLICY IF EXISTS "Photographers can read own clients" ON public.clients;
CREATE POLICY "Photographers can read own clients" ON public.clients
  FOR SELECT USING (has_studio_permission(photographer_id, 'clients'));
DROP POLICY IF EXISTS "Photographers can update own clients" ON public.clients;
CREATE POLICY "Photographers can update own clients" ON public.clients
  FOR UPDATE USING (has_studio_permission(photographer_id, 'clients'));
DROP POLICY IF EXISTS "Photographers can CRUD own contract_custom_fields" ON public.contract_custom_fields;
CREATE POLICY "Photographers can CRUD own contract_custom_fields" ON public.contract_custom_fields
  FOR ALL USING (has_studio_permission(photographer_id, 'clients')) WITH CHECK (has_studio_permission(photographer_id, 'clients'));
DROP POLICY IF EXISTS "Photographers can CRUD own contracts" ON public.contracts;
CREATE POLICY "Photographers can CRUD own contracts" ON public.contracts
  FOR ALL USING (has_studio_permission(photographer_id, 'clients')) WITH CHECK (has_studio_permission(photographer_id, 'clients'));

-- EMAILS
DROP POLICY IF EXISTS "Owners can delete followup templates" ON public.followup_email_templates;
CREATE POLICY "Owners can delete followup templates" ON public.followup_email_templates
  FOR DELETE USING (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Owners can insert followup templates" ON public.followup_email_templates;
CREATE POLICY "Owners can insert followup templates" ON public.followup_email_templates
  FOR INSERT WITH CHECK (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Owners can update followup templates" ON public.followup_email_templates;
CREATE POLICY "Owners can update followup templates" ON public.followup_email_templates
  FOR UPDATE USING (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Owners can view followup templates" ON public.followup_email_templates;
CREATE POLICY "Owners can view followup templates" ON public.followup_email_templates
  FOR SELECT USING (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Photographers can CRUD own automated emails" ON public.mkt_email_automated;
CREATE POLICY "Photographers can CRUD own automated emails" ON public.mkt_email_automated
  FOR ALL USING (has_studio_permission(photographer_id, 'emails')) WITH CHECK (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Photographers can CRUD own campaign emails" ON public.mkt_email_campaign_emails;
CREATE POLICY "Photographers can CRUD own campaign emails" ON public.mkt_email_campaign_emails
  FOR ALL USING (EXISTS (SELECT 1 FROM mkt_email_campaigns c WHERE c.id = mkt_email_campaign_emails.campaign_id AND has_studio_permission(c.photographer_id, 'emails')))
  WITH CHECK (EXISTS (SELECT 1 FROM mkt_email_campaigns c WHERE c.id = mkt_email_campaign_emails.campaign_id AND has_studio_permission(c.photographer_id, 'emails')));
DROP POLICY IF EXISTS "Photographers can CRUD own email campaigns" ON public.mkt_email_campaigns;
CREATE POLICY "Photographers can CRUD own email campaigns" ON public.mkt_email_campaigns
  FOR ALL USING (has_studio_permission(photographer_id, 'emails')) WITH CHECK (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Photographers can CRUD own oneoff emails" ON public.mkt_email_oneoff;
CREATE POLICY "Photographers can CRUD own oneoff emails" ON public.mkt_email_oneoff
  FOR ALL USING (has_studio_permission(photographer_id, 'emails')) WITH CHECK (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Users can insert own project emails" ON public.project_emails;
CREATE POLICY "Users can insert own project emails" ON public.project_emails
  FOR INSERT WITH CHECK (has_studio_permission(photographer_id, 'emails'));
DROP POLICY IF EXISTS "Users can view own project emails" ON public.project_emails;
CREATE POLICY "Users can view own project emails" ON public.project_emails
  FOR SELECT USING (has_studio_permission(photographer_id, 'emails'));

-- PUSH
DROP POLICY IF EXISTS "Photographers can CRUD own push notifications" ON public.mkt_push_notifications;
CREATE POLICY "Photographers can CRUD own push notifications" ON public.mkt_push_notifications
  FOR ALL USING (has_studio_permission(photographer_id, 'push')) WITH CHECK (has_studio_permission(photographer_id, 'push'));
DROP POLICY IF EXISTS "Users can manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own push subscriptions" ON public.push_subscriptions
  FOR ALL USING (has_studio_permission(photographer_id, 'push')) WITH CHECK (has_studio_permission(photographer_id, 'push'));

-- SOCIAL (mapped to blog)
DROP POLICY IF EXISTS "Photographers can CRUD own social posts" ON public.mkt_social_posts;
CREATE POLICY "Photographers can CRUD own social posts" ON public.mkt_social_posts
  FOR ALL USING (has_studio_permission(photographer_id, 'blog')) WITH CHECK (has_studio_permission(photographer_id, 'blog'));

-- NOTIFICATIONS (owner-only)
DROP POLICY IF EXISTS "Photographers can CRUD own notification preferences" ON public.notification_preferences;
CREATE POLICY "Photographers can CRUD own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = photographer_id) WITH CHECK (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Photographers can read own notifications" ON public.notifications;
CREATE POLICY "Photographers can read own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = photographer_id);
DROP POLICY IF EXISTS "Photographers can update own notifications" ON public.notifications;
CREATE POLICY "Photographers can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = photographer_id);

-- GALLERIES
DROP POLICY IF EXISTS "Photographers can CRUD own galleries" ON public.galleries;
CREATE POLICY "Photographers can CRUD own galleries" ON public.galleries
  FOR ALL USING (has_studio_permission(photographer_id, 'galleries')) WITH CHECK (has_studio_permission(photographer_id, 'galleries'));
DROP POLICY IF EXISTS "Photographers can CRUD own gallery settings" ON public.gallery_settings;
CREATE POLICY "Photographers can CRUD own gallery settings" ON public.gallery_settings
  FOR ALL USING (has_studio_permission(photographer_id, 'galleries')) WITH CHECK (has_studio_permission(photographer_id, 'galleries'));
DROP POLICY IF EXISTS "Photographers read own gallery favorites" ON public.photo_favorites;
CREATE POLICY "Photographers read own gallery favorites" ON public.photo_favorites
  FOR SELECT USING (EXISTS (SELECT 1 FROM galleries g WHERE g.id = photo_favorites.gallery_id AND has_studio_permission(g.photographer_id, 'galleries')));
DROP POLICY IF EXISTS "Photographers can CRUD own photos" ON public.photos;
CREATE POLICY "Photographers can CRUD own photos" ON public.photos
  FOR ALL USING (has_studio_permission(photographer_id, 'galleries')) WITH CHECK (has_studio_permission(photographer_id, 'galleries'));

-- CHAT
DROP POLICY IF EXISTS "Photographers can CRUD own help conversations" ON public.help_conversations;
CREATE POLICY "Photographers can CRUD own help conversations" ON public.help_conversations
  FOR ALL USING (has_studio_permission(photographer_id, 'chat')) WITH CHECK (has_studio_permission(photographer_id, 'chat'));
DROP POLICY IF EXISTS "Photographers can CRUD own help messages" ON public.help_messages;
CREATE POLICY "Photographers can CRUD own help messages" ON public.help_messages
  FOR ALL USING (EXISTS (SELECT 1 FROM help_conversations c WHERE c.id = help_messages.conversation_id AND has_studio_permission(c.photographer_id, 'chat')))
  WITH CHECK (EXISTS (SELECT 1 FROM help_conversations c WHERE c.id = help_messages.conversation_id AND has_studio_permission(c.photographer_id, 'chat')));

-- PHOTOGRAPHERS (keep get_my_photographer_id so members can read owner profile)
DROP POLICY IF EXISTS "Photographers can read own profile" ON public.photographers;
CREATE POLICY "Photographers can read own profile" ON public.photographers
  FOR SELECT USING (id = get_my_photographer_id());

-- FINANCE
DROP POLICY IF EXISTS "Photographers can CRUD own project invoices" ON public.project_invoices;
CREATE POLICY "Photographers can CRUD own project invoices" ON public.project_invoices
  FOR ALL USING (has_studio_permission(photographer_id, 'finance')) WITH CHECK (has_studio_permission(photographer_id, 'finance'));
DROP POLICY IF EXISTS "Photographers can delete their project payments" ON public.project_payments;
CREATE POLICY "Photographers can delete their project payments" ON public.project_payments
  FOR DELETE USING (has_studio_permission(photographer_id, 'finance'));
DROP POLICY IF EXISTS "Photographers can insert their project payments" ON public.project_payments;
CREATE POLICY "Photographers can insert their project payments" ON public.project_payments
  FOR INSERT WITH CHECK (has_studio_permission(photographer_id, 'finance'));
DROP POLICY IF EXISTS "Photographers can update their project payments" ON public.project_payments;
CREATE POLICY "Photographers can update their project payments" ON public.project_payments
  FOR UPDATE USING (has_studio_permission(photographer_id, 'finance'));
DROP POLICY IF EXISTS "Photographers can view their project payments" ON public.project_payments;
CREATE POLICY "Photographers can view their project payments" ON public.project_payments
  FOR SELECT USING (has_studio_permission(photographer_id, 'finance'));

-- RECURRING
DROP POLICY IF EXISTS "Photographers can CRUD own recurring tasks" ON public.recurring_tasks;
CREATE POLICY "Photographers can CRUD own recurring tasks" ON public.recurring_tasks
  FOR ALL USING (has_studio_permission(photographer_id, 'recurring')) WITH CHECK (has_studio_permission(photographer_id, 'recurring'));

-- SESSIONS
DROP POLICY IF EXISTS "Photographers can CRUD own availability" ON public.session_availability;
CREATE POLICY "Photographers can CRUD own availability" ON public.session_availability
  FOR ALL USING (has_studio_permission(photographer_id, 'sessions')) WITH CHECK (has_studio_permission(photographer_id, 'sessions'));
DROP POLICY IF EXISTS "Photographers can CRUD own day configs" ON public.session_day_config;
CREATE POLICY "Photographers can CRUD own day configs" ON public.session_day_config
  FOR ALL USING (has_studio_permission(photographer_id, 'sessions')) WITH CHECK (has_studio_permission(photographer_id, 'sessions'));
DROP POLICY IF EXISTS "Photographers can CRUD own sessions" ON public.sessions;
CREATE POLICY "Photographers can CRUD own sessions" ON public.sessions
  FOR ALL USING (has_studio_permission(photographer_id, 'sessions')) WITH CHECK (has_studio_permission(photographer_id, 'sessions'));
