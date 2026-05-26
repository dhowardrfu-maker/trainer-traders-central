// Supabase Edge Function: create-connect-account
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
    // Check if seller already has a connect account
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_connect_id, stripe_connect_enabled")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = profile?.stripe_connect_id;

    // Create a new Express account if they don't have one
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "GB",
        capabilities: {
          transfers: { requested: true },
        },
        settings: {
          payouts: {
            schedule: { interval: "manual" },
          },
        },
      });

      accountId = account.id;

      // Save the connect account ID to the profile
      await supabase
        .from("profiles")
        .update({ stripe_connect_id: accountId })
        .eq("user_id", user.id);
    }

    // Generate an onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://www.prelovedkicks.co.uk/profile?tab=payments&connect=refresh",
      return_url: "https://www.prelovedkicks.co.uk/profile?tab=payments&connect=success",
      type: "account_onboarding",
    });

    return json({ url: accountLink.url });
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