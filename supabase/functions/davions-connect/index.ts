import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_token, email, password } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    // Support both: api_token (existing plugin) or email+password (future)
    if (api_token) {
      // Token-based auth: validate the JWT token
      const authedClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: `Bearer ${api_token}` } } }
      );

      const { data: claims, error: claimsError } = await authedClient.auth.getClaims(api_token);
      if (claimsError || !claims?.claims) {
        return new Response(
          JSON.stringify({ status: "error", message: "Invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = claims.claims.sub as string;
      const { data: photographer } = await authedClient
        .from("photographers")
        .select("id, email")
        .eq("id", userId)
        .single();

      return new Response(
        JSON.stringify({
          status: "success",
          response: {
            photographer_id: photographer?.id ?? userId,
            email: photographer?.email ?? (claims.claims.email as string) ?? "",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Email+password auth
    if (!email || !password) {
      return new Response(
        JSON.stringify({ status: "error", message: "Email and password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.session) {
      return new Response(
        JSON.stringify({ status: "error", message: "Invalid credentials" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } } }
    );

    const { data: photographer } = await authedClient
      .from("photographers")
      .select("id, email")
      .eq("id", authData.user.id)
      .single();

    return new Response(
      JSON.stringify({
        status: "success",
        response: {
          photographer_id: photographer?.id ?? authData.user.id,
          email: photographer?.email ?? authData.user.email,
        },
        token: authData.session.access_token,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
