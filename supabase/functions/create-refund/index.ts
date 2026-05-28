// Supabase Edge Function: create-refund
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

  // Use service role so we can update orders and listings regardless of RLS
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Still verify the calling user is authenticated
  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // Get order — use admin client so RLS doesn't block
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("id, buyer_id, seller_id, listing_id, stripe_payment_intent_id, status, payout_sent")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    // Check caller is admin, buyer, or seller
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .maybeSingle();

    const isAdmin = profile?.is_admin === true;
    const isParty = order.buyer_id === user.id || order.seller_id === user.id;

    if (!isAdmin && !isParty) {
      return json({ error: "Unauthorized" }, 403);
    }

    // Can't refund if payout already sent
    if (order.payout_sent) return json({ error: "Payout already sent — contact support" }, 400);

    if (!order.stripe_payment_intent_id) {
      return json({ error: "No payment intent found for this order" }, 400);
    }

    // Issue full refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
    });

    // Mark order as cancelled
    await supabaseAdmin
      .from("orders")
      .update({ status: "cancelled", dispute_status: null })
      .eq("id", order_id);

    // Reinstate listing to active
    await supabaseAdmin
      .from("listings")
      .update({ status: "active" })
      .eq("id", Number(order.listing_id));

    // Notify buyer — refund issued
    await supabaseAdmin.rpc("insert_notification", {
      p_user_id: order.buyer_id,
      p_type: "refund_issued",
      p_title: "Refund issued",
      p_body: "Your order has been cancelled and a full refund has been issued. It may take a few days to reach your account.",
      p_link: `/order/${order_id}`,
    });

    // Notify seller — order cancelled
    await supabaseAdmin.rpc("insert_notification", {
      p_user_id: order.seller_id,
      p_type: "order_cancelled",
      p_title: "Order cancelled — listing reinstated",
      p_body: "A refund was issued on this order. Your listing is now active again.",
      p_link: `/order/${order_id}`,
    });

    return json({ success: true, refund_id: refund.id });
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