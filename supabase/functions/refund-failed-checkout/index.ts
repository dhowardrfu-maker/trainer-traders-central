// Supabase Edge Function: refund-failed-checkout
// Covers the gap where Stripe successfully charges a buyer but
// create_order then fails right after (most commonly: someone else
// bought the same listing a second earlier, so it's no longer 'active').
// Until now that left the buyer charged with no order and no automatic
// refund, relying on them noticing and emailing support. This lets the
// client trigger an immediate refund for exactly that situation, with
// server-side checks so it can't be used to refund a real, completed
// purchase: the PaymentIntent must belong to the calling user, and no
// order may already exist for it.
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

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.metadata?.buyer_id !== user.id) {
      return json({ error: "Unauthorized" }, 403);
    }
    if (paymentIntent.status !== "succeeded") {
      return json({ error: "Nothing to refund" }, 400);
    }

    // If an order already exists for this payment, this is a completed,
    // legitimate purchase -- refuse, so this endpoint can never be used
    // to refund a real sale outside the proper cancellation/dispute flows.
    const { data: existingOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_payment_intent_id", payment_intent_id)
      .maybeSingle();
    if (existingOrder) {
      return json({ error: "An order already exists for this payment" }, 400);
    }

    const refund = await stripe.refunds.create(
      { payment_intent: payment_intent_id },
      { idempotencyKey: `failed-checkout-refund-${payment_intent_id}` }
    );

    return json({ ok: true, refund_id: refund.id });
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
