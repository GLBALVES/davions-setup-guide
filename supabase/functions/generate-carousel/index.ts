import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tema, tom, nicho, quantidade = 7, marca, cta } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um especialista em marketing digital e criação de conteúdo para Instagram. Gere carrosséis educativos e envolventes em português brasileiro.`;

    const userPrompt = `Crie um carrossel para Instagram com ${quantidade} slides sobre o tema: "${tema}".
Tom de voz: ${tom}.
${nicho ? `Nicho: ${nicho}.` : ""}
${marca ? `Marca/nome: ${marca}.` : ""}
${cta ? `CTA final: ${cta}.` : "Use um CTA envolvente no último slide."}

Retorne usando a função generate_carousel.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_carousel",
              description: "Retorna os dados estruturados de um carrossel para Instagram.",
              parameters: {
                type: "object",
                properties: {
                  titulo_serie: { type: "string", description: "Título geral da série/carrossel" },
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        numero: { type: "number", description: "Número do slide (1-based)" },
                        tag: { type: "string", description: "Tag curta do slide (ex: DICA, ERRO, RESULTADO)" },
                        titulo: { type: "string", description: "Título principal do slide" },
                        corpo: { type: "string", description: "Texto do corpo do slide (2-3 frases)" },
                        cta: { type: "string", description: "Call-to-action do slide" },
                      },
                      required: ["numero", "tag", "titulo", "corpo", "cta"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["titulo_serie", "slides"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_carousel" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Tente novamente em alguns segundos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const carousel = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(carousel), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-carousel error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
