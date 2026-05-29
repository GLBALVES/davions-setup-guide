import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // ── Require authenticated caller ──
    const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.slice(7).trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResp({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { ticket_id, message, agent_slug, mode, messages: directMessages } = body;

    // Determine if this is a direct/test call (no ticket_id, has messages array)
    const isDirectMode = !ticket_id && Array.isArray(directMessages);

    // ── For ticket mode, verify the ticket belongs to the caller (or caller is admin) ──
    if (!isDirectMode) {
      if (!ticket_id || typeof ticket_id !== "string") {
        return jsonResp({ error: "ticket_id required" }, 400);
      }
      const { data: ticket } = await supabase
        .from("support_tickets")
        .select("id, photographer_id")
        .eq("id", ticket_id)
        .maybeSingle();
      if (!ticket) return jsonResp({ error: "Ticket not found" }, 404);

      if (ticket.photographer_id !== userId) {
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle();
        if (!adminRole) return jsonResp({ error: "Forbidden" }, 403);
      }
    }

    // Fetch agent config
    let systemPrompt = "You are a helpful customer support assistant. Be polite, concise, and professional.";
    let model = "google/gemini-3-flash-preview";
    let temperature = 0.7;

    if (agent_slug && typeof agent_slug === "string") {
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
      messages = [
        { role: "system", content: systemPrompt },
        ...directMessages,
      ];
    } else {
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
        return jsonResp({ error: "Rate limit exceeded. Please try again later." }, 429);
      }
      if (response.status === 402) {
        return jsonResp({ error: "Payment required. Please add credits." }, 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    if (isDirectMode) {
      return jsonResp({ reply: aiContent });
    }

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

    return jsonResp({ content: aiContent, role: insertRole });
  } catch (e) {
    console.error("ai-chat error:", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
