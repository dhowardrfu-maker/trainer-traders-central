// Supabase Edge Function: get-service-points
// Proxies Sendcloud's service points API to find nearby InPost lockers by postcode.
// Keeps Sendcloud credentials server-side.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json(null, 200);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  try {
    const { postcode } = await req.json();
    if (!postcode) return json({ error: "Missing postcode" }, 400);

    const publicKey = Deno.env.get("SENDCLOUD_PUBLIC_KEY")!;
    const secretKey = Deno.env.get("SENDCLOUD_SECRET_KEY")!;
    const credentials = btoa(`${publicKey}:${secretKey}`);

    const url = `https://panel.sendcloud.sc/api/v2/service-points/?country=GB&carrier=inpost&address=${encodeURIComponent(postcode)}&radius=10`;

    const res = await fetch(url, {
      headers: { "Authorization": `Basic ${credentials}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Sendcloud service points error:", err);
      return json({ error: "Could not fetch InPost lockers" }, 500);
    }

    const data = await res.json();
    console.log("Sendcloud raw response:", JSON.stringify(data).slice(0, 1000));
    console.log("Request URL was:", url);

    // Sendcloud may wrap results in a key rather than returning a raw array
    const rawList = Array.isArray(data) ? data : (data?.service_points ?? data?.results ?? []);
    console.log("Resolved list length:", rawList.length);

    // Return a simplified list — only what the UI needs
    const lockers = rawList.slice(0, 20).map((sp: Record<string, unknown>) => ({
      id: String(sp.id),
      name: sp.name,
      address: `${sp.street} ${sp.house_number}, ${sp.city}`,
      postcode: sp.postal_code,
    }));

    return json({ lockers });
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