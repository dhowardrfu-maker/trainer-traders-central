// Supabase Edge Function: create-shipping-label
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v2";
const SHIPPING_METHOD_CODE = "royal_mailv2:tracked_48/kg=0-2,size=s,labelless";

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
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // Load order from Supabase
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    // Only the seller can generate the label
    if (order.seller_id !== user.id) return json({ error: "Unauthorized" }, 403);

    // If label already generated, return existing
    if (order.sendcloud_label_url) {
      return json({
        label_url: order.sendcloud_label_url,
        qr_url: order.sendcloud_qr_url,
        tracking_number: order.sendcloud_tracking_number,
      });
    }

    // Call Sendcloud API to create parcel
    const publicKey = Deno.env.get("SENDCLOUD_PUBLIC_KEY")!;
    const secretKey = Deno.env.get("SENDCLOUD_SECRET_KEY")!;
    const credentials = btoa(`${publicKey}:${secretKey}`);

    const parcelPayload = {
      parcel: {
        name: order.ship_to_name,
        address: order.ship_to_line1,
        address_2: order.ship_to_line2 ?? "",
        city: order.ship_to_city,
        postal_code: order.ship_to_postcode,
        country: { iso_2: "GB" },
        telephone: "",
        email: "",
        weight: "1.000",
        shipment: { id: SHIPPING_METHOD_CODE },
        order_number: order.id,
        request_label: true,
        apply_shipping_rules: false,
      },
    };

    const scRes = await fetch(`${SENDCLOUD_API}/parcels`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parcelPayload),
    });

    const scData = await scRes.json();

    if (!scRes.ok) {
      console.error("Sendcloud error:", JSON.stringify(scData));
      return json({ error: scData?.error?.message ?? "Label creation failed" }, 500);
    }

    const parcel = scData.parcel;
    const labelUrl = parcel.label?.label_printer ?? null;
    const qrUrl = parcel.label?.normal_printer?.[0] ?? labelUrl;
    const trackingNumber = parcel.tracking_number ?? null;
    const sendcloudParcelId = parcel.id ?? null;

    // Update order with label details
    await supabase
      .from("orders")
      .update({
        sendcloud_parcel_id: String(sendcloudParcelId),
        sendcloud_label_url: labelUrl,
        sendcloud_qr_url: qrUrl,
        sendcloud_tracking_number: trackingNumber,
        status: "label_created",
      })
      .eq("id", order_id);

    return json({ label_url: labelUrl, qr_url: qrUrl, tracking_number: trackingNumber });
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