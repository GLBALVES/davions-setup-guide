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
    const { title, keyword, secondaryKeywords, tone, articleSize, structure, cta, language } = await req.json();

    if (!title || !keyword) {
      return new Response(JSON.stringify({ error: "title and keyword are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

    const systemPrompt = `You are a professional blog writer specialized in photography businesses. Write high-quality, SEO-optimized blog articles.
Return a JSON object with these fields:
- title: string (the final blog title)
- slug: string (URL-friendly slug, lowercase, hyphens)
- content: string (full HTML article content with h2/h3 subtitles, paragraphs)
- meta_title: string (SEO meta title, 30-60 chars)
- meta_description: string (SEO meta description, 80-155 chars)
- secondary_keywords: string[] (3-5 related keywords used in the article)
- og_title: string (Open Graph title)
- og_description: string (Open Graph description)
- word_count: number (approximate word count)
- reading_time_minutes: number (estimated reading time)
- cover_image_alt: string (suggested alt text for cover image)
- middle_image_alt: string (suggested alt text for middle image)
No markdown wrapping, just raw JSON.`;

    const userPrompt = `Write a blog article with:
Title/Theme: ${title}
Main keyword: ${keyword}
Secondary keywords: ${secondaryKeywords || "generate relevant ones"}
Tone: ${tone || "Informativo e próximo"}
Article size: ${articleSize || "Médio (800-1200 palavras)"}
Structure: ${structure || "Introdução + subtítulos + conclusão"}
CTA: ${cta || "não incluir CTA"}

Write the article in ${
      language === "Inglês" || language === "English" || language === "en"
        ? "English (US)"
        : language === "Espanhol" || language === "Español" || language === "Spanish" || language === "es"
        ? "Spanish (neutral Latin American)"
        : "Portuguese (Brazil)"
    }. All fields (title, slug, content, meta_title, meta_description, og_title, og_description, alt texts, secondary_keywords) MUST be in this language.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AI Gateway error: ${res.status} - ${errText}`);
    }

    const aiData = await res.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-blog error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
