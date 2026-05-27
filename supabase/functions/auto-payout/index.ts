// Supabase Edge Function: auto-payout
// Called by pg_cron every hour — pays out sellers on orders delivered 48hrs ago with no dispute
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // This function is called by the cron job using the service role key
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    // Find all orders that:
    // - are shipped
    // - have evri_delivered_at set
    // - evri_delivered_at was more than 48 hours ago
    // - no dispute raised (dispute_status = 'none')
    // - payout not yet sent
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, seller_id, total_pence, postage_pence, stripe_payment_intent_id, payout_sent")
      .eq("status", "shipped")
      .eq("dispute_status", "none")
      .eq("payout_sent", false)
      .not("evri_delivered_at", "is", null)
      .lt("evri_delivered_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error("Error fetching orders:", error);
      return json({ error: "Failed to fetch orders" }, 500);
    }

    if (!orders || orders.length === 0) {
      return json({ message: "No orders ready for payout", count: 0 });
    }

    const results = [];

    for (const order of orders) {
      try {
        // Get seller's Connect account
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("stripe_connect_id, stripe_connect_enabled")
          .eq("user_id", order.seller_id)
          .maybeSingle();

        if (!sellerProfile?.stripe_connect_id || !sellerProfile?.stripe_connect_enabled) {
          results.push({ order_id: order.id, status: "skipped", reason: "No verified Connect account" });
          continue;
        }

        // Calculate seller payout amount
        const postagePence = order.postage_pence ?? 0;
        const protectionPence = Math.round((order.total_pence - postagePence) / 1.04 * 0.04);
        const sellerPence = order.total_pence - postagePence - protectionPence;

        // Transfer to seller
        const transfer = await stripe.transfers.create({
          amount: sellerPence,
          currency: "gbp",
          destination: sellerProfile.stripe_connect_id,
          metadata: { order_id: String(order.id), seller_id: order.seller_id, reason: "auto_payout_48h" },
        });

        // Mark order as delivered and payout sent
        await supabase
          .from("orders")
          .update({
            status: "delivered",
            payout_sent: true,
            payout_transfer_id: transfer.id,
          })
          .eq("id", order.id);

        results.push({ order_id: order.id, status: "paid", transfer_id: transfer.id, amount: sellerPence });
      } catch (e) {
        console.error(`Failed to payout order ${order.id}:`, e);
        results.push({ order_id: order.id, status: "failed", error: String(e) });
      }
    }

    return json({ message: "Auto-payout complete", count: results.length, results });
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