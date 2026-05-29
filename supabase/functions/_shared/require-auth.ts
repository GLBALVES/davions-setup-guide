// Shared JWT validator used across edge functions to lock down endpoints
// that previously accepted unauthenticated traffic.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface AuthResult {
  userId: string;
  email: string | null;
  token: string;
}

/**
 * Validates the incoming request's `Authorization: Bearer <jwt>` header.
 * Returns `{ response }` if the request is unauthenticated — callers should
 * return it immediately. Otherwise returns `{ auth }` with the user id/email.
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ response?: Response; auth?: AuthResult }> {
  const authHeader = req.headers.get("Authorization") ?? req.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return {
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  const token = authHeader.slice(7).trim();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return {
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }

  return { auth: { userId: data.user.id, email: data.user.email ?? null, token } };
}
