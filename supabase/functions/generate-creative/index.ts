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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { type, tema, tom, formato, plataforma, orientacao, numSlides, nicho, gradientPrompt } = body;

    // --- THEMES GENERATION ---
    if (type === "themes") {
      const systemPrompt = `You are a digital marketing expert. Generate creative themes for social media posts.
Respond ONLY via tool call with the generate_themes function.`;

      const userPrompt = `Generate 6 creative themes for social media posts in the niche: ${nicho || "photography"}.
Each theme should have a short, catchy title and a 1-2 sentence description.`;

      const tools = [{
        type: "function",
        function: {
          name: "generate_themes",
          description: "Returns a list of creative themes",
          parameters: {
            type: "object",
            properties: {
              temas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    titulo: { type: "string", description: "Short theme title" },
                    descricao: { type: "string", description: "Brief description" },
                  },
                  required: ["titulo", "descricao"],
                },
              },
            },
            required: ["temas"],
            additionalProperties: false,
          },
        },
      }];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          tools,
          tool_choice: { type: "function", function: { name: "generate_themes" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const result = toolCall ? JSON.parse(toolCall.function.arguments) : { temas: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- TEXT GENERATION ---
    if (type === "text") {
      const slidesCount = numSlides || 4;
      const orientacaoExtra = orientacao ? `\nAdditional instructions: ${orientacao}` : "";

      const systemPrompt = `You are a digital marketing and social media expert. Generate creative content for posts.
Respond ONLY via tool call with the generate_creative_text function.`;

      const userPrompt = `Generate content for a ${formato} on ${plataforma}.
Topic: ${tema}
Tone: ${tom}${orientacaoExtra}
${formato === "carrossel" ? `Generate content for ${slidesCount} carousel slides, each with a title and subtitle.` : "Generate title, subtitle and CTA."}
Include relevant hashtags.`;

      const tools = [{
        type: "function",
        function: {
          name: "generate_creative_text",
          description: "Returns structured texts for the creative",
          parameters: {
            type: "object",
            properties: {
              titulo: { type: "string", description: "Main title" },
              subtitulo: { type: "string", description: "Subtitle" },
              cta: { type: "string", description: "Call to action" },
              hashtags: { type: "array", items: { type: "string" } },
              slides: {
                type: "array",
                description: "Carousel slides (only if format=carousel)",
                items: {
                  type: "object",
                  properties: { titulo: { type: "string" }, subtitulo: { type: "string" } },
                  required: ["titulo", "subtitulo"],
                },
              },
            },
            required: ["titulo", "subtitulo", "cta", "hashtags"],
            additionalProperties: false,
          },
        },
      }];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          tools,
          tool_choice: { type: "function", function: { name: "generate_creative_text" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const textos = toolCall ? JSON.parse(toolCall.function.arguments) : null;

      return new Response(JSON.stringify({ textos }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- IMAGE GENERATION ---
    if (type === "image") {
      const orientacaoExtra = orientacao ? ` Additional style guidance: ${orientacao}` : "";
      const imagePrompt = `Create a professional social media background image for ${plataforma}.
Theme: ${tema}
Tone: ${tom}
Style: Modern, clean, vibrant colors. No text in the image. Abstract or lifestyle background suitable for overlaying text.${orientacaoExtra}
Format: ${formato?.includes("story") ? "Vertical 9:16 aspect ratio" : formato?.includes("landscape") || formato?.includes("twitter") ? "Horizontal 16:9 aspect ratio" : formato?.includes("pinterest") ? "Vertical 2:3 aspect ratio" : "Square 1:1 aspect ratio"}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content: imagePrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded for image generation." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("Image generation error:", status, t);
        throw new Error(`Image generation error: ${status}`);
      }

      const data = await response.json();
      const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageData) {
        return new Response(JSON.stringify({ error: "Could not generate image." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      const fileName = `criativos/${Date.now()}-${crypto.randomUUID()}.png`;

      const { error: uploadError } = await supabase.storage.from("creative-assets").upload(fileName, binaryData, { contentType: "image/png" });
      if (uploadError) { console.error("Upload error:", uploadError); throw new Error("Error saving image"); }

      const { data: urlData } = supabase.storage.from("creative-assets").getPublicUrl(fileName);

      return new Response(JSON.stringify({ image_url: urlData.publicUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- GRADIENT GENERATION ---
    if (type === "gradient") {
      const systemPrompt = `You are a design expert specializing in color palettes and gradients. Generate gradient suggestions for social media.
Respond ONLY via tool call with the generate_gradients function.`;

      const contextHint = gradientPrompt
        ? `Requested style: ${gradientPrompt}`
        : "Generate varied, modern and vibrant gradients";

      const userPrompt = `Generate 5 modern and vibrant gradient suggestions for a social media post.
${contextHint}
Tone: ${tom || "professional"}
Each gradient should have 2 colors in HEX format and a CSS direction (e.g. "135deg", "to right", "to bottom", "45deg").
Give a short creative name for each gradient.`;

      const tools = [{
        type: "function",
        function: {
          name: "generate_gradients",
          description: "Returns gradient suggestions",
          parameters: {
            type: "object",
            properties: {
              gradientes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    color1: { type: "string", description: "First HEX color" },
                    color2: { type: "string", description: "Second HEX color" },
                    direction: { type: "string", description: "CSS gradient direction" },
                    name: { type: "string", description: "Creative gradient name" },
                  },
                  required: ["color1", "color2", "direction", "name"],
                },
              },
            },
            required: ["gradientes"],
            additionalProperties: false,
          },
        },
      }];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
          tools,
          tool_choice: { type: "function", function: { name: "generate_gradients" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      const result = toolCall ? JSON.parse(toolCall.function.arguments) : { gradientes: [] };

      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use 'text', 'image', 'themes' or 'gradient'." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-creative error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
