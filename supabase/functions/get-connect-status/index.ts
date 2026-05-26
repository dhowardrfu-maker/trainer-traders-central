// Supabase Edge Function: get-connect-status
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_id, stripe_connect_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.stripe_connect_id) {
      return json({ connected: false, enabled: false });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(profile.stripe_connect_id);

    const enabled =
      account.charges_enabled === true &&
      account.payouts_enabled === true &&
      account.details_submitted === true;

    // Update the profile if status has changed
    if (enabled !== profile.stripe_connect_enabled) {
      await supabase
        .from("profiles")
        .update({ stripe_connect_enabled: enabled })
        .eq("user_id", user.id);
    }

    return json({
      connected: true,
      enabled,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      details_submitted: account.details_submitted,
    });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}