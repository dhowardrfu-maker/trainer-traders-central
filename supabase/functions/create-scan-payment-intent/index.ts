// Supabase Edge Function: create-scan-payment-intent
// One-off £2.50 charge that unlocks tag scanning for a seller. Mirrors
// create-payment-intent's shape but with a flat price, no listing involved.
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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("scanning_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.scanning_enabled) {
      return json({ error: "Scanning is already active on your account" }, 400);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: SCANNING_PRICE_PENCE,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: { purpose: "scanning_activation", user_id: user.id },
      description: "PrelovedKicks — Tag scanning activation",
    });

    return json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      amount_pence: SCANNING_PRICE_PENCE,
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
