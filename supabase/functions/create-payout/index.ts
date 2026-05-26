// Supabase Edge Function: create-payout
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
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // Get order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, seller_id, buyer_id, total_pence, postage_pence, stripe_payment_intent_id, payout_sent, status")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);
    if (order.payout_sent) return json({ error: "Payout already sent" }, 400);
    if (order.status !== "delivered") return json({ error: "Order not yet delivered" }, 400);

    // Get seller's Stripe Connect ID
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("stripe_connect_id, stripe_connect_enabled")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (!sellerProfile?.stripe_connect_id) {
      return json({ error: "Seller has not set up payouts" }, 400);
    }

    if (!sellerProfile.stripe_connect_enabled) {
      return json({ error: "Seller payout account not fully verified" }, 400);
    }

    // Calculate payout amounts
    // total_pence = item_pence + protection_pence (4%) + postage_pence
    // We keep: protection_pence + postage_pence
    // Seller gets: item_pence = total_pence - protection_pence - postage_pence
    const postagePence = order.postage_pence ?? 0;
    const protectionPence = Math.round((order.total_pence - postagePence) / 1.04 * 0.04);
    const sellerPence = order.total_pence - postagePence - protectionPence;

    // Transfer seller's share to their connected account
    const transfer = await stripe.transfers.create({
      amount: sellerPence,
      currency: "gbp",
      destination: sellerProfile.stripe_connect_id,
      metadata: {
        order_id: String(order.id),
        seller_id: order.seller_id,
      },
    });

    // Mark payout as sent on the order
    await supabase
      .from("orders")
      .update({ payout_sent: true, payout_transfer_id: transfer.id })
      .eq("id", order_id);

    return json({
      success: true,
      transfer_id: transfer.id,
      seller_pence: sellerPence,
      platform_keeps_pence: protectionPence + postagePence,
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