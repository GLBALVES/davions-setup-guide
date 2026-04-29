import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAILS = [
  "gilberto@giombelli.com.br",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Admin check: either user_roles 'admin' OR hardcoded admin email
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    const isAdmin = !!roleRow || ADMIN_EMAILS.includes((user.email || "").toLowerCase());
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { lead_id, redirect_to } = await req.json();
    if (!lead_id) return json({ error: "lead_id is required" }, 400);

    // Load lead
    const { data: lead, error: leadErr } = await admin
      .from("leads")
      .select("id, name, email, invited_at, invited_user_id")
      .eq("id", lead_id)
      .maybeSingle();

    if (leadErr || !lead) return json({ error: "Lead not found" }, 404);
    if (!lead.email) return json({ error: "Lead has no email" }, 400);

    const email = String(lead.email).trim().toLowerCase();
    const fullName = (lead.name || "").trim();

    // Check if a user already exists for this email
    const { data: existingList } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      // @ts-ignore - filter not always typed
      filter: `email.eq.${email}`,
    } as any);

    let existingUser = existingList?.users?.find((u: any) => (u.email || "").toLowerCase() === email);

    // listUsers filter may not work on all versions — fallback scan first page
    if (!existingUser) {
      const { data: page1 } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      existingUser = page1?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
    }

    if (existingUser) {
      // User already exists — send a password recovery email so they can (re)set password and access the app.
      const { error: resetErr } = await admin.auth.resetPasswordForEmail(email, {
        redirectTo: redirect_to || undefined,
      });
      if (resetErr) {
        console.error("resetPasswordForEmail error", resetErr);
        return json({ error: resetErr.message || "Failed to send recovery email" }, 400);
      }

      // Make sure the photographer record exists and is approved
      await admin
        .from("photographers")
        .upsert(
          { id: existingUser.id, email, full_name: fullName, approval_status: "approved" },
          { onConflict: "id" }
        );

      await admin
        .from("leads")
        .update({ invited_at: new Date().toISOString(), invited_user_id: existingUser.id })
        .eq("id", lead_id);

      return json({ success: true, already_existed: true, recovery_sent: true, user_id: existingUser.id }, 200);
    }

    // Send invite (creates user + sends "Invite user" email)
    const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: redirect_to || undefined,
    });

    if (inviteErr || !invited?.user) {
      return json({ error: inviteErr?.message || "Failed to invite user" }, 400);
    }

    const newUserId = invited.user.id;

    // Ensure photographer row is approved (handle_new_user trigger creates it as 'pending')
    await admin
      .from("photographers")
      .upsert(
        {
          id: newUserId,
          email,
          full_name: fullName,
          approval_status: "approved",
        },
        { onConflict: "id" }
      );

    // Mark lead as invited
    await admin
      .from("leads")
      .update({ invited_at: new Date().toISOString(), invited_user_id: newUserId })
      .eq("id", lead_id);

    return json({ success: true, user_id: newUserId }, 200);
  } catch (err: any) {
    console.error("invite-lead-as-user error", err);
    return json({ error: err?.message || "Internal error" }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
