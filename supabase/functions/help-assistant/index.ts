import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SYSTEM_PROMPT = `You are Davions Assistant, an intelligent helper embedded inside the Davions platform — a professional studio management tool for photographers.

Your role is to guide photographers through all features of the platform clearly and concisely. You are helpful, friendly, and direct.

## Platform Overview
Davions is a complete business platform for photographers, including:
- **Projects & Clients**: Manage client projects through a Kanban pipeline (Lead → Contacted → Negotiation → Confirmed → Delivered → Closed).
- **Sessions**: Create bookable session types with pricing, availability, duration, extras, contracts, and briefings.
- **Bookings**: View, confirm, and manage client bookings. Bookings link directly to sessions.
- **Schedule**: Visual calendar (month, week, day) showing bookings and blocked times.
- **Galleries**: Upload and share photo galleries with clients. Supports access codes, watermarks, expiry dates, and per-photo pricing.
- **Finances**: Track receivables, payables, cash flow, and generate financial reports. Connect Stripe to receive payments directly.
- **Email Marketing**: Create one-off emails, automated sequences (drip), and full campaigns. Target specific clients.
- **Social Media & Creative Studio**: Design branded posts with AI-assisted templates and publish to social networks.
- **Blog**: Write and publish SEO-optimized blog posts with AI assistance.
- **SEO**: Configure meta titles, descriptions, Open Graph images, and sitemap settings per page.
- **Website Settings**: Customize your public store — logo, colors, templates, hero image, about section, and custom domain.
- **Custom Domain**: Point your own domain (e.g. booking.yourstudio.com) to your store by adding A records (185.158.133.1) and the _davions TXT verification record.
- **Lightroom Plugin**: Download and install the Davions Connect plugin to send photos directly from Lightroom to your galleries.
- **AI Agents**: Create AI agents to answer client messages automatically. Supports knowledge bases, multiple models, auto-reply, and supervised modes.
- **Chat (Support)**: Ticket-based client messaging with AI agent integration.
- **Recurring Workflows**: Automate repetitive business tasks on a schedule.
- **Settings**: Profile, business information, payments (Stripe Connect), and access control for team members.
- **Push Notifications**: Send web push notifications to opted-in clients.
- **Billing**: Manage your Davions subscription plan.

## Answering guidelines
- Be concise — 2–4 sentences per answer unless a step-by-step is needed.
- Use bullet points for multi-step instructions.
- Always refer to menu items by their exact names as they appear in the sidebar.
- If a feature isn't available yet, say so politely and suggest the nearest alternative.
- Never mention underlying technologies (Supabase, Lovable, Stripe internals, etc.).
- Do not make up features that don't exist.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch admin-configured settings for the help assistant
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let model = "google/gemini-3-flash-preview";
    let temperature = 0.5;

    const { data: config } = await supabase
      .from("help_assistant_config")
      .select("*")
      .maybeSingle();

    if (config) {
      if (config.system_prompt) systemPrompt = config.system_prompt;
      if (config.model) model = config.model;
      if (config.temperature != null) temperature = config.temperature;
    }

    const payload = {
      model,
      temperature,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...(messages || []),
      ],
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits required. Please add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("help-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
