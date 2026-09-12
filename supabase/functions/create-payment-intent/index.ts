// Supabase Edge Function: create-payment-intent
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUYER_PROTECTION_RATE = 0.05;

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
    const { listing_id, carrier_id, postage_pence, offer_id } = await req.json();
    if (!listing_id || !carrier_id || postage_pence == null) return json({ error: "Missing fields" }, 400);

    const { data: listing, error: listErr } = await supabase
      .from("listings").select("id, title, brand, price_pence, seller_id, status, promotion_active, promotion_percent")
      .eq("id", listing_id).maybeSingle();

    if (listErr || !listing) return json({ error: "Listing not found" }, 404);
    if (listing.status !== "active") return json({ error: "Listing no longer available" }, 400);
    if (listing.seller_id === user.id) return json({ error: "Cannot buy your own listing" }, 400);

    // Must mirror create_order's effective_price exactly (same condition,
    // same rounding), otherwise Stripe charges the buyer one amount while
    // the order records another -- this was never applied here before,
    // so a promoted listing charged the buyer full price via Stripe while
    // the order/seller-payout math assumed the discounted price.
    let item_pence = listing.price_pence;
    if (listing.promotion_active && listing.promotion_percent != null) {
      item_pence = Math.round((listing.price_pence * (100 - listing.promotion_percent)) / 100);
    }
    if (offer_id) {
      const { data: offer } = await supabase.from("offers")
        .select("amount_pence, status, buyer_id, listing_id")
        .eq("id", offer_id).maybeSingle();
      if (!offer || offer.status !== "accepted" || offer.buyer_id !== user.id) return json({ error: "Offer not valid" }, 400);
      item_pence = offer.amount_pence;
    }

    const protection_pence = Math.round(item_pence * BUYER_PROTECTION_RATE);
    const total_pence = item_pence + protection_pence + postage_pence;

    // Every payment goes to the platform's own Stripe balance -- the
    // seller is paid later, exclusively via create-payout/auto-payout,
    // once the buyer confirms receipt or the 48-hour window passes. This
    // used to also set transfer_data.destination when a seller already
    // had Connect verified at checkout time, which makes Stripe transfer
    // funds to the seller immediately and automatically on payment. That
    // directly contradicts the "money held until delivery confirmed"
    // buyer-protection model, and would double-pay the seller once
    // create-payout/auto-payout's separate manual transfer also fires for
    // the same order. Confirmed via a live DB check that no past order
    // has ever hit this branch (no seller had stripe_connect_enabled at
    // time of purchase), so removing it now is safe, before it's not.
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: total_pence,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        listing_id: String(listing_id),
        buyer_id: user.id,
        seller_id: listing.seller_id,
        item_pence: String(item_pence),
        protection_pence: String(protection_pence),
        postage_pence: String(postage_pence),
        carrier_id,
        offer_id: offer_id ?? "",
      },
      description: `PrelovedKicks — ${listing.brand} ${listing.title}`,
    };

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      item_pence,
      protection_pence,
      postage_pence,
      total_pence,
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