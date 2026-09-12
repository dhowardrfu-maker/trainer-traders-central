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

  // This moves real money, so it needs to be more than "some Bearer token
  // was present" -- the platform's own JWT check accepts any valid Supabase
  // key, including the public anon key shipped in the site's JS bundle.
  // The pg_cron job that calls this already sends the actual service role
  // key as its Bearer token (pulled from Vault), so require exactly that,
  // not just any authenticated caller.
  const authHeader = req.headers.get("Authorization");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (authHeader !== `Bearer ${serviceRoleKey}`) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey
  );

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

  try {
    // dispute_status has no default and is only ever set to a non-null value
    // when a dispute is actually raised, so "no dispute" means IS NULL, not
    // = 'none' (NULL = 'none' is never true in SQL -- this previously never
    // matched a single order). Similarly, evri_delivered_at is only ever set
    // by confirm_order_receipt, which sets status to 'delivered' in the same
    // update, so status can never be 'shipped' once evri_delivered_at is
    // set -- this is a safety net for orders already marked delivered whose
    // payout somehow never got recorded, not a "shipped" case.
    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, seller_id, buyer_id, total_pence, postage_pence, protection_pence, shipping_protection_fee_pence, stripe_payment_intent_id, payout_sent")
      .eq("status", "delivered")
      .is("dispute_status", null)
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
        // protection_pence is stored directly on the order (set at checkout),
        // not reverse-derived from a rate -- correct regardless of what the
        // buyer-protection rate is set to now or was when this order was placed.
        const protectionPence = order.protection_pence ?? 0;
        // shipping_protection_fee_pence is never added to total_pence (the
        // buyer is never charged for it) -- it's funded by the seller, so
        // it comes straight off their payout here instead.
        const shippingProtectionFeePence = order.shipping_protection_fee_pence ?? 0;
        const sellerPence = order.total_pence - postagePence - protectionPence - shippingProtectionFeePence;

        // Atomically claim this payout before calling Stripe -- the
        // original SELECT above already filtered on payout_sent = false,
        // but that's a check-then-act race against a manual create-payout
        // call (or another concurrent run of this same cron) hitting the
        // same order in the gap between that SELECT and this UPDATE. This
        // WHERE clause makes the claim itself atomic: only one caller can
        // ever flip payout_sent from false to true for a given order.
        const { data: claimed } = await supabase
          .from("orders")
          .update({ payout_sent: true })
          .eq("id", order.id)
          .eq("payout_sent", false)
          .select("id")
          .maybeSingle();

        if (!claimed) {
          results.push({ order_id: order.id, status: "skipped", reason: "Payout already sent or in progress" });
          continue;
        }

        let transfer;
        try {
          transfer = await stripe.transfers.create(
            {
              amount: sellerPence,
              currency: "gbp",
              destination: sellerProfile.stripe_connect_id,
              metadata: { order_id: String(order.id), seller_id: order.seller_id, reason: "auto_payout_48h" },
            },
            { idempotencyKey: `payout-${order.id}` }
          );
        } catch (stripeErr) {
          // Release the claim so the next hourly run can retry after a
          // transient Stripe error, instead of the order being stuck
          // "paid" with no transfer having actually happened.
          await supabase.from("orders").update({ payout_sent: false }).eq("id", order.id);
          throw stripeErr;
        }

        await supabase
          .from("orders")
          .update({
            status: "delivered",
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