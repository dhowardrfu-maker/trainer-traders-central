// Supabase Edge Function: create-shipping-label
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sendcloud API v3 — required for this account
const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";
// Evri Standard Delivery dropoff shipping option code
const EVRI_SHIPPING_OPTION_CODE = "hermes_c2c_gb:s2a/dropoff";

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

    const publicKey = Deno.env.get("SENDCLOUD_PUBLIC_KEY")!;
    const secretKey = Deno.env.get("SENDCLOUD_SECRET_KEY")!;
    const credentials = btoa(`${publicKey}:${secretKey}`);

    // Load seller's address from their profile
    const { data: sellerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("full_name, address_line1, address_line2, city, postcode, phone")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (profileErr || !sellerProfile?.full_name || !sellerProfile?.address_line1 || !sellerProfile?.city || !sellerProfile?.postcode) {
      return json({ error: "Seller profile address is incomplete. Please update your profile before generating a label." }, 400);
    }

    // Create and announce shipment via Sendcloud API v3
    const shipmentPayload = {
      to_address: {
        name: order.ship_to_name,
        address_line_1: order.ship_to_line1,
        address_line_2: order.ship_to_line2 ?? "",
        city: order.ship_to_city,
        postal_code: order.ship_to_postcode,
        country_code: "GB",
        email: "",
        phone_number: "",
      },
      from_address: {
        name: sellerProfile.full_name,
        address_line_1: sellerProfile.address_line1,
        address_line_2: sellerProfile.address_line2 ?? "",
        city: sellerProfile.city,
        postal_code: sellerProfile.postcode,
        country_code: "GB",
        phone_number: sellerProfile.phone ?? "",
        email: "",
      },
      parcels: [
        {
          weight: { value: 1.0, unit: "kg" },
          order_number: String(order.id),
        },
      ],
      ship_with: {
        type: "shipping_option_code",
        properties: {
          shipping_option_code: EVRI_SHIPPING_OPTION_CODE,
        },
      },
      apply_shipping_rules: false,
    };

    const scRes = await fetch(`${SENDCLOUD_API}/shipments/announce`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shipmentPayload),
    });

    const scData = await scRes.json();

    if (!scRes.ok) {
      console.error("Sendcloud error:", JSON.stringify(scData));
      return json({ error: scData?.message ?? scData?.error?.message ?? "Label creation failed" }, 500);
    }

    // v3 response: data.parcels array
    const parcel = scData?.data?.parcels?.[0] ?? scData?.data;
    const trackingNumber = parcel?.tracking_number ?? null;
    const sendcloudParcelId = parcel?.id ?? null;
    const labelPrinterUrl = parcel?.label?.label_printer ?? parcel?.label?.normal_printer?.[0] ?? null;

    let labelDataUrl: string | null = null;

    if (labelPrinterUrl) {
      // Fetch the PDF label server-side to avoid CORS issues on the client
      const pdfRes = await fetch(labelPrinterUrl, {
        headers: { "Authorization": `Basic ${credentials}` },
      });
      if (pdfRes.ok) {
        const pdfBytes = await pdfRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        labelDataUrl = `data:application/pdf;base64,${base64}`;
      } else {
        console.error("Failed to fetch PDF label:", pdfRes.status);
        labelDataUrl = labelPrinterUrl;
      }
    }

    const qrUrl = parcel?.label?.normal_printer?.[0] ?? labelPrinterUrl;

    // Update order with label details
    await supabase
      .from("orders")
      .update({
        sendcloud_parcel_id: String(sendcloudParcelId),
        sendcloud_label_url: labelDataUrl,
        sendcloud_qr_url: qrUrl,
        sendcloud_tracking_number: trackingNumber,
        status: "label_created",
      })
      .eq("id", order_id);

    return json({ label_url: labelDataUrl, qr_url: qrUrl, tracking_number: trackingNumber });
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