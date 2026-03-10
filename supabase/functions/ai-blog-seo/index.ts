import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, content, action, theme_description, image_prompt, theme_suggestion, content_size } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Image generation uses a different model
    if (action === "generate_image") {
      const prompt = image_prompt || `Professional, modern illustration for a photography blog post about: ${title}. Clean editorial style, elegant, black and white tones with subtle accents. No text in the image. High quality, photorealistic.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a few seconds." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        throw new Error(`AI gateway error: ${status}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url || "";

      return new Response(JSON.stringify({ result: imageUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Text-based actions
    let systemPrompt = "";

    if (action === "generate_themes") {
      systemPrompt = 'You are a content marketing specialist for photographers. Generate 5-8 blog post themes relevant to photography businesses, client engagement, portfolio tips, behind-the-scenes, and industry trends. Return ONLY JSON: [{"theme":"...","description":"...","category":"..."}]';
    } else if (action === "generate_content") {
      systemPrompt = 'You are a professional blog writer for photographers. Generate a complete article in HTML about the given topic. Use proper heading hierarchy (h2, h3), paragraphs, lists where appropriate. The tone should be professional yet approachable. Return JSON: {"title":"...","summary":"...","content":"<h2>...</h2>...","meta_description":"...","tags":["..."],"category":"..."}';
    } else if (action === "suggest_image_prompt") {
      systemPrompt = "You are an art director specialized in creating prompts for AI image generation. Given the title and content of an article, create a short and creative description (2-3 sentences) for generating a suitable image. The description should focus on visual elements. Return ONLY the description text, nothing else.";
    } else if (action === "meta_description") {
      systemPrompt = "You are an SEO specialist. Given an article title and content, generate a compelling meta description in English between 140-155 characters. Return ONLY the meta description text, nothing else.";
    } else if (action === "suggest_tags") {
      systemPrompt = 'You are an SEO specialist. Given an article title and content, suggest 5-8 SEO-optimized tags/keywords in English. Return ONLY a JSON array of strings, e.g. ["tag1","tag2"].';
    } else if (action === "improve_title") {
      systemPrompt = "You are an SEO specialist. Given an article title and content, suggest 3 improved SEO-optimized title alternatives in English, each under 60 characters. Return ONLY a JSON array of strings.";
    } else {
      systemPrompt = "You are an SEO specialist. Analyze the article and provide a JSON object with: { score: number 0-100, suggestions: string[] } with SEO improvement tips in English.";
    }

    let userContent = "";
    if (action === "generate_themes") {
      userContent = theme_suggestion
        ? `Generate themes similar or related to: "${theme_suggestion}". Focus on variations, deep-dives and different angles of this subject for photography businesses.`
        : "Generate a list of new and relevant blog post themes for a photography business blog. Focus on current topics that drive engagement.";
    } else if (action === "generate_content") {
      const sizeMap: Record<string, string> = {
        small: "approximately 500 words (short and direct article)",
        medium: "approximately 1000 words (medium-length article)",
        large: "approximately 2000 words (long, in-depth article)",
      };
      const sizeInstruction = sizeMap[content_size || "medium"] || sizeMap.medium;
      userContent = `Generate a complete article about the following topic:\n\nTopic: ${title}\nDescription: ${theme_description || ""}\nDesired length: ${sizeInstruction}\n\nFollow all formatting and SEO rules from your system prompt.`;
    } else if (action === "suggest_image_prompt") {
      userContent = `Title: ${title}\n\nContent (summary): ${(content || "").slice(0, 2000)}\n\nCreate a creative visual description for generating an AI image that complements this article.`;
    } else {
      userContent = `Title: ${title}\n\nContent: ${(content || "").slice(0, 3000)}`;
    }

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
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a few seconds." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Insufficient credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-blog-seo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
