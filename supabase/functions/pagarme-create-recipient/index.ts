// Creates a Pagar.me v5 recipient for the authenticated photographer and
// stores the recipient_id on photographers. Whitelabel — UI never mentions
// Pagar.me to the end user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Phone = { ddd: string; number: string };

type Address = {
  street: string;
  complementary?: string;
  street_number: string;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  reference_point?: string;
};

type BankAccount = {
  holder_name: string;
  holder_document: string;
  bank: string;
  branch_number: string;
  branch_check_digit?: string;
  account_number: string;
  account_check_digit: string;
  type: "checking" | "savings";
};

type Payload =
  | {
      type: "individual";
      email: string;
      name: string;
      document: string; // CPF
      mother_name?: string;
      birthdate: string; // DD/MM/YYYY
      monthly_income: number;
      professional_occupation?: string;
      phone: Phone;
      address: Address;
      bank: BankAccount;
    }
  | {
      type: "corporation";
      email: string;
      document: string; // CNPJ
      company_name: string;
      trading_name?: string;
      annual_revenue: number;
      corporation_type?: string;
      founding_date: string; // DD/MM/YYYY
      phone: Phone;
      address: Address;
      managing_partner: {
        name: string;
        document: string; // CPF
        mother_name?: string;
        birthdate: string;
        monthly_income: number;
        professional_occupation?: string;
        email: string;
        phone: Phone;
        address: Address;
      };
      bank: BankAccount;
    };

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const apiKey = Deno.env.get("PAGARME_API_KEY");
    if (!apiKey) throw new Error("Payment provider not configured");

    const body = (await req.json()) as Payload;
    if (!body || !body.type) throw new Error("Invalid payload");

    // Build Pagar.me payload
    const phoneObj = (p: Phone) => ({
      ddd: onlyDigits(p.ddd),
      number: onlyDigits(p.number),
      type: "mobile" as const,
    });

    const addressObj = (a: Address) => ({
      street: a.street,
      street_number: a.street_number,
      complementary: a.complementary?.trim() || "N/A",
      reference_point: a.reference_point?.trim() || "N/A",
      neighborhood: a.neighborhood,
      city: a.city,
      state: a.state,
      zip_code: onlyDigits(a.zip_code),
    });

    let register_information: any;
    let holder_type: "individual" | "company";

    if (body.type === "individual") {
      holder_type = "individual";
      register_information = {
        type: "individual",
        email: body.email,
        document: onlyDigits(body.document),
        site_url: null,
        name: body.name,
        mother_name: body.mother_name || body.name,
        birthdate: body.birthdate,
        monthly_income: Math.round(body.monthly_income * 100),
        professional_occupation: body.professional_occupation || "Photographer",
        phone_numbers: [phoneObj(body.phone)],
        address: addressObj(body.address),
      };
    } else {
      holder_type = "company";
      register_information = {
        type: "corporation",
        email: body.email,
        document: onlyDigits(body.document),
        site_url: null,
        company_name: body.company_name,
        trading_name: body.trading_name || body.company_name,
        annual_revenue: Math.round(body.annual_revenue * 100),
        corporation_type: body.corporation_type || "limited",
        founding_date: body.founding_date,
        phone_numbers: [phoneObj(body.phone)],
        address: addressObj(body.address),
        managing_partners: [
          {
            type: "individual",
            name: body.managing_partner.name,
            email: body.managing_partner.email,
            document: onlyDigits(body.managing_partner.document),
            mother_name:
              body.managing_partner.mother_name || body.managing_partner.name,
            birthdate: body.managing_partner.birthdate,
            monthly_income: Math.round(body.managing_partner.monthly_income * 100),
            professional_occupation:
              body.managing_partner.professional_occupation || "Photographer",
            phone_numbers: [phoneObj(body.managing_partner.phone)],
            address: addressObj(body.managing_partner.address),
            self_declared_legal_representative: true,
          },
        ],
      };
    }

    // Pagar.me requires the bank account holder document to match the recipient
    // document (CPF for individual, CNPJ for corporation). Force it here to
    // avoid validation errors from minor formatting/typing differences.
    const recipientDocument = onlyDigits(body.document);

    const default_bank_account = {
      holder_name: body.bank.holder_name,
      holder_type,
      holder_document: recipientDocument,
      bank: onlyDigits(body.bank.bank).padStart(3, "0"),
      branch_number: onlyDigits(body.bank.branch_number),
      branch_check_digit: body.bank.branch_check_digit
        ? onlyDigits(body.bank.branch_check_digit)
        : undefined,
      account_number: onlyDigits(body.bank.account_number),
      account_check_digit: body.bank.account_check_digit,
      type: body.bank.type,
    };


    const pagarmePayload = {
      register_information,
      default_bank_account,
      transfer_settings: {
        transfer_enabled: true,
        transfer_interval: "Daily",
        transfer_day: 0,
      },
      automatic_anticipation_settings: {
        enabled: false,
        type: "full",
        volume_percentage: "100",
        delay: null,
      },
      code: userId,
    };

    const auth = "Basic " + btoa(apiKey + ":");
    const res = await fetch("https://api.pagar.me/core/v5/recipients", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify(pagarmePayload),
    });
    const data = await res.json();

    if (!res.ok) {
      console.error("[pagarme-create-recipient] error", data);
      return new Response(
        JSON.stringify({
          error: data?.message || "Failed to create payment account",
          details: data,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save on photographer
    await supabase
      .from("photographers")
      .update({
        pagarme_recipient_id: data.id,
        pagarme_kyc_status: data.status ?? "pending",
        pagarme_connected_at: new Date().toISOString(),
        business_country: "BR",
        business_currency: "BRL",
      })
      .eq("id", userId);

    return new Response(
      JSON.stringify({ ok: true, recipient_id: data.id, status: data.status }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[pagarme-create-recipient]", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
