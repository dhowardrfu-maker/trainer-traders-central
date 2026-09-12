// Supabase Edge Function: confirm-scan-payment
// Replaces the old activate_scanning RPC, which accepted any non-empty
// string as a "payment intent id" and never actually verified anything
// with Stripe -- any signed-in user could call it directly and unlock
// scanning for free. This actually retrieves the PaymentIntent from
// Stripe and checks it really succeeded, for the right amount, and for
// this exact user, before touching the database.
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCANNING_PRICE_PENCE = 250;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    const { payment_intent_id } = await req.json();
    if (!payment_intent_id) return json({ error: "Missing payment_intent_id" }, 400);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("scanning_enabled")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile?.scanning_enabled) return json({ error: "Scanning is already active on your account" }, 400);

    // Has this exact payment already been used to activate scanning on
    // any account? Stops a real (but already-spent) payment intent id
    // being replayed across multiple accounts.
    const { data: alreadyUsed } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("scanning_payment_intent_id", payment_intent_id)
      .maybeSingle();
    if (alreadyUsed) return json({ error: "This payment has already been used" }, 400);

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== "succeeded") {
      return json({ error: "Payment has not succeeded" }, 400);
    }
    if (paymentIntent.amount !== SCANNING_PRICE_PENCE || paymentIntent.currency !== "gbp") {
      return json({ error: "Payment amount does not match" }, 400);
    }
    if (paymentIntent.metadata?.purpose !== "scanning_activation" || paymentIntent.metadata?.user_id !== user.id) {
      return json({ error: "This payment was not for scanning activation on this account" }, 400);
    }

    const { error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({
        scanning_enabled: true,
        scanning_payment_intent_id: payment_intent_id,
        scanning_purchased_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateErr) return json({ error: "Could not activate scanning" }, 500);

    return json({ ok: true });
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
