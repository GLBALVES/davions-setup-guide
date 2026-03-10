import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { ticket_id, message, agent_slug, mode, messages: directMessages } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Determine if this is a direct/test call (no ticket_id, has messages array)
    const isDirectMode = !ticket_id && Array.isArray(directMessages);

    // Fetch agent config
    let systemPrompt = "You are a helpful customer support assistant. Be polite, concise, and professional.";
    let model = "google/gemini-3-flash-preview";
    let temperature = 0.7;

    if (agent_slug) {
      const { data: agent } = await supabase
        .from("ai_agents")
        .select("*")
        .eq("slug", agent_slug)
        .eq("enabled", true)
        .maybeSingle();

      if (agent) {
        systemPrompt = agent.system_prompt || systemPrompt;
        model = agent.model || model;
        temperature = agent.temperature ?? temperature;

        // Append knowledge base to system prompt (support both "title" and "topic" field names)
        const kb = agent.knowledge_base as Array<{ title?: string; topic?: string; content: string }>;
        if (kb && kb.length > 0) {
          systemPrompt += "\n\n## Knowledge Base\n";
          kb.forEach((item) => {
            const heading = item.topic || item.title || "Info";
            systemPrompt += `\n### ${heading}\n${item.content}\n`;
          });
        }
      }
    }

    let messages: Array<{ role: string; content: string }>;

    if (isDirectMode) {
      // Direct mode: use provided messages, no DB interaction
      messages = [
        { role: "system", content: systemPrompt },
        ...directMessages,
      ];
    } else {
      // Ticket mode: fetch conversation history from DB
      const { data: history } = await supabase
        .from("support_messages")
        .select("role, content")
        .eq("ticket_id", ticket_id)
        .neq("role", "assistant_draft")
        .order("created_at", { ascending: true })
        .limit(50);

      messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((m: { role: string; content: string }) => ({
          role: m.role === "admin" ? "assistant" : m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      ];

      // Add latest user message if provided
      if (message) {
        messages.push({ role: "user", content: message });
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature, stream: false }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    // In direct mode, just return the reply without saving to DB
    if (isDirectMode) {
      return new Response(JSON.stringify({ reply: aiContent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ticket mode: determine role based on mode and save to DB
    const insertRole = mode === "supervised" ? "assistant_draft" : "assistant";

    const { error: insertError } = await supabase
      .from("support_messages")
      .insert({
        ticket_id,
        role: insertRole,
        content: aiContent,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to save AI response");
    }

    return new Response(JSON.stringify({ content: aiContent, role: insertRole }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
