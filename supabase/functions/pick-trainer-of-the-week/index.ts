// Picks Trainer of the Week and writes it to site_settings. Triggered by
// a GitHub Actions cron workflow every Monday — see .github/workflows/
// trainer-of-the-week.yml. Not user-facing; protected by a shared secret
// rather than a user JWT, since this is machine-to-machine.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Shared-secret check — this endpoint is called by a scheduled GitHub
  // Action, not a logged-in user, so it can't use the normal user JWT flow.
  const provided = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (!expected || provided !== expected) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: listings, error } = await supa
      .from("listings")
      .select("id, price_pence, retail_price_pence")
      .eq("status", "active");

    if (error) return json({ error: error.message }, 500);
    if (!listings || listings.length === 0) {
      return json({ error: "No active listings to pick from" }, 200);
    }

    // Preferred pool: listings with a retail price set and a genuine
    // discount vs retail. Falls back to the full active pool if that's
    // empty — e.g. while retail-price adoption among sellers is still low.
    const withDeal = listings.filter(
      (l) => l.retail_price_pence && l.retail_price_pence > l.price_pence
    );
    const pool = withDeal.length > 0 ? withDeal : listings;

    // Weighted random pick: bigger discount = more weight, but every
    // eligible listing has a nonzero chance. Falls back to plain random
    // (equal weight) when using the full-pool fallback, since there's no
    // discount to weight by there.
    const weights = pool.map((l) => {
      if (!l.retail_price_pence || l.retail_price_pence <= l.price_pence) return 1;
      const discountPct = (l.retail_price_pence - l.price_pence) / l.retail_price_pence;
      return 1 + discountPct * 10; // e.g. 30% off -> weight 4
    });
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let picked = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) { picked = pool[i]; break; }
    }

    const { error: upsertErr } = await supa
      .from("site_settings")
      .upsert(
        { key: "trainer_of_the_week", value: { listing_id: picked.id }, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (upsertErr) return json({ error: upsertErr.message }, 500);

    return json({ picked_listing_id: picked.id, pool_size: pool.length, used_fallback: withDeal.length === 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}