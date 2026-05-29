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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, seller_id, buyer_id, total_pence, postage_pence, stripe_payment_intent_id, payout_sent")
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
        const { data: sellerProfile } = await supabase
          .from("profiles")
          .select("stripe_connect_id, stripe_connect_enabled")
          .eq("user_id", order.seller_id)
          .maybeSingle();

        if (!sellerProfile?.stripe_connect_id || !sellerProfile?.stripe_connect_enabled) {
          results.push({ order_id: order.id, status: "skipped", reason: "No verified Connect account" });
          continue;
        }

        const postagePence = order.postage_pence ?? 0;
        const protectionPence = Math.round((order.total_pence - postagePence) / 1.04 * 0.04);
        const sellerPence = order.total_pence - postagePence - protectionPence;

        const transfer = await stripe.transfers.create({
          amount: sellerPence,
          currency: "gbp",
          destination: sellerProfile.stripe_connect_id,
          metadata: { order_id: String(order.id), seller_id: order.seller_id, reason: "auto_payout_48h" },
        });

        await supabase
          .from("orders")
          .update({
            status: "delivered",
            payout_sent: true,
            payout_transfer_id: transfer.id,
          })
          .eq("id", order.id);

        // Notify seller — sale completed (auto payout)
        await supabase.rpc("insert_notification", {
          p_user_id: order.seller_id,
          p_type: "sale_completed",
          p_title: "Sale completed — payout sent! 🎉",
          p_body: `Your payout of £${(sellerPence / 100).toFixed(2)} has been sent to your bank account.`,
          p_link: `/order/${order.id}`,
        });

        // Notify buyer — sale completed
        await supabase.rpc("insert_notification", {
          p_user_id: order.buyer_id,
          p_type: "sale_completed",
          p_title: "Your order is complete",
          p_body: "The seller has been paid. We hope you love your kicks!",
          p_link: `/order/${order.id}`,
        });

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