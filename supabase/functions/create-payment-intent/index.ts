// Supabase Edge Function: create-payment-intent
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUYER_PROTECTION_RATE = 0.04;

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
      .from("listings").select("id, title, brand, price_pence, seller_id, status")
      .eq("id", listing_id).maybeSingle();

    if (listErr || !listing) return json({ error: "Listing not found" }, 404);
    if (listing.status !== "active") return json({ error: "Listing no longer available" }, 400);
    if (listing.seller_id === user.id) return json({ error: "Cannot buy your own listing" }, 400);

    let item_pence = listing.price_pence;
    if (offer_id) {
      const { data: offer } = await supabase.from("offers")
        .select("amount_pence, status, buyer_id, listing_id")
        .eq("id", offer_id).maybeSingle();
      if (!offer || offer.status !== "accepted" || offer.buyer_id !== user.id) return json({ error: "Offer not valid" }, 400);
      item_pence = offer.amount_pence;
    }

    const protection_pence = Math.round(item_pence * BUYER_PROTECTION_RATE);
    const total_pence = item_pence + protection_pence + postage_pence;

    // Check if seller has a verified Connect account
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("stripe_connect_id, stripe_connect_enabled")
      .eq("user_id", listing.seller_id)
      .maybeSingle();

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

    // If seller has a verified Connect account, route funds via Connect
    if (sellerProfile?.stripe_connect_id && sellerProfile?.stripe_connect_enabled) {
      const platform_fee = protection_pence + postage_pence;
      paymentIntentParams.application_fee_amount = platform_fee;
      paymentIntentParams.transfer_data = {
        destination: sellerProfile.stripe_connect_id,
      };
    }

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