import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, platform, image_url, caption, credentials: directCredentials } = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Test connection with provided credentials
    if (action === "test") {
      const creds = directCredentials;
      if (!creds?.page_access_token) {
        return new Response(JSON.stringify({ success: false, error: "Access token not provided" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (platform === "facebook") {
        const pageId = creds.page_id;
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}?fields=name,id&access_token=${creds.page_access_token}`);
        const data = await res.json();
        if (data.error) {
          return new Response(JSON.stringify({ success: false, error: data.error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, name: data.name }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (platform === "instagram") {
        const igId = creds.ig_account_id;
        const res = await fetch(`https://graph.facebook.com/v21.0/${igId}?fields=username,id&access_token=${creds.page_access_token}`);
        const data = await res.json();
        if (data.error) {
          return new Response(JSON.stringify({ success: false, error: data.error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, name: data.username || data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: false, error: "Unsupported platform" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Publish action
    if (action === "publish") {
      const { data: connData, error: connError } = await supabaseAdmin
        .from("social_api_connections")
        .select("credentials")
        .eq("platform", platform)
        .eq("is_active", true)
        .single();

      if (connError || !connData) {
        return new Response(JSON.stringify({ error: `${platform} connection not found or inactive` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const creds = connData.credentials as Record<string, string>;
      const token = creds.page_access_token;

      if (platform === "facebook") {
        const pageId = creds.page_id;
        const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: image_url,
            message: caption || "",
            access_token: token,
          }),
        });
        const data = await res.json();
        if (data.error) {
          return new Response(JSON.stringify({ error: data.error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
        return new Response(JSON.stringify({ success: true, post_id: data.post_id || data.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (platform === "instagram") {
        const igId = creds.ig_account_id;
        const containerRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: image_url,
            caption: caption || "",
            access_token: token,
          }),
        });
        const containerData = await containerRes.json();
        if (containerData.error) {
          return new Response(JSON.stringify({ error: containerData.error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const creationId = containerData.id;
        await new Promise((r) => setTimeout(r, 3000));

        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: creationId,
            access_token: token,
          }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) {
          return new Response(JSON.stringify({ error: publishData.error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        return new Response(JSON.stringify({ success: true, post_id: publishData.id }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Unsupported platform" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
