import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { blogTitle, keyword, position, imagePrompt } = await req.json();

    if (!blogTitle) {
      return new Response(JSON.stringify({ error: "blogTitle is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const size = position === "cover" ? "1200x630" : "800x450";
    const prompt = imagePrompt || `Professional photography blog image for: "${blogTitle}". Keyword: ${keyword}. Style: high quality, professional blog photography, modern aesthetic. Size: ${size}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway error: ${res.status} - ${errText}`);
    }

    const aiData = await res.json();
    const choice = aiData.choices?.[0]?.message;

    // Check for inline_data (image response)
    if (choice?.parts) {
      for (const part of choice.parts) {
        if (part.inline_data?.data) {
          return new Response(
            JSON.stringify({ imageBase64: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Fallback: check content for base64
    const content = choice?.content;
    if (content && content.startsWith("data:image")) {
      return new Response(
        JSON.stringify({ imageBase64: content }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("No image generated from AI response");
  } catch (err) {
    console.error("generate-blog-image error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
