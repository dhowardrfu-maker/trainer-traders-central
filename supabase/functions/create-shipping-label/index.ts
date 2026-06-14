// Supabase Edge Function: create-shipping-label
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sendcloud API v3 — required for this account
const SENDCLOUD_API = "https://panel.sendcloud.sc/api/v3";

// Sendcloud shipping option codes per carrier + parcel size.
// Mirrors src/data/carriers.ts SENDCLOUD_CODES — kept in sync manually.
const SENDCLOUD_CODES: Record<string, Record<string, string>> = {
  evri: {
    small: "hermes_c2c_gb:s2a/dropoff",
    medium: "hermes_c2c_gb:s2a/dropoff",
    large: "hermes_c2c_gb:s2a/dropoff",
    extra_large: "hermes_c2c_gb:s2a/dropoff",
  },
  royal_mail: {
    small: "royal_mailv2:tracked_48/kg=0-2,size=s,labelless",
    medium: "royal_mailv2:tracked_48/kg=0-2,size=m,labelless",
  },
  inpost: {
    small: "inpost_gb:l2l/kg=0-15,size=s",
    medium: "inpost_gb:l2l/kg=0-15,size=m",
    large: "inpost_gb:l2l/kg=0-15,size=l",
  },
};

const DEFAULT_SIZE = "medium";

// Resolve the Sendcloud shipping option code for a carrier + parcel size,
// falling back to the medium size for that carrier, and finally to Evri's
// default code if the carrier/size combination is unsupported.
const resolveShippingOptionCode = (carrier: string, sizeCategory: string | null): string => {
  const size = sizeCategory ?? DEFAULT_SIZE;
  const carrierCodes = SENDCLOUD_CODES[carrier] ?? SENDCLOUD_CODES.evri;
  return carrierCodes[size] ?? carrierCodes[DEFAULT_SIZE] ?? SENDCLOUD_CODES.evri[DEFAULT_SIZE];
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

    console.log("Order loaded:", order.id, "seller:", order.seller_id, "carrier:", order.carrier);

    // If label already generated, return existing
    if (order.sendcloud_label_url) {
      console.log("Label already exists, returning cached");
      return json({
        label_url: order.sendcloud_label_url,
        qr_url: order.sendcloud_qr_url,
        tracking_number: order.sendcloud_tracking_number,
      });
    }

    // Look up the listing's parcel size to pick the right shipping option code
    const { data: listingRow } = await supabase
      .from("listings")
      .select("size_category")
      .eq("id", order.listing_id)
      .maybeSingle();

    const sizeCategory = listingRow?.size_category ?? null;
    const shippingOptionCode = resolveShippingOptionCode(order.carrier, sizeCategory);
    console.log("Carrier:", order.carrier, "Size category:", sizeCategory, "Shipping option code:", shippingOptionCode);

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
          shipping_option_code: shippingOptionCode,
        },
      },
      apply_shipping_rules: false,
    };

    console.log("Seller profile loaded:", sellerProfile.full_name, sellerProfile.postcode);
    console.log("Calling Sendcloud API v3...");

    const scRes = await fetch(`${SENDCLOUD_API}/shipments/announce`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shipmentPayload),
    });

    console.log("Sendcloud response status:", scRes.status);
    const scData = await scRes.json();
    console.log("Sendcloud response data:", JSON.stringify(scData).slice(0, 500));

    if (!scRes.ok) {
      console.error("Sendcloud error:", JSON.stringify(scData));
      return json({ error: scData?.message ?? scData?.error?.message ?? "Label creation failed" }, 500);
    }

    // v3 response: data object directly (not data.parcels array)
    const shipment = scData?.data;
    console.log("Shipment keys:", Object.keys(shipment ?? {}).join(", "));
    const shipmentId = shipment?.id ?? null;
    const trackingNumber = shipment?.parcels?.[0]?.tracking_number ?? shipment?.tracking_number ?? null;
    const sendcloudParcelId = shipment?.parcels?.[0]?.id ?? shipmentId ?? null;
    console.log("Shipment ID:", shipmentId, "Tracking:", trackingNumber);

    // In v3, fetch the label separately using the shipment ID
    let labelPrinterUrl: string | null = null;
    if (shipmentId) {
      // Get the parcel ID from the shipment parcels array
      const parcelId = shipment?.parcels?.[0]?.id ?? null;
      console.log("Parcel ID:", parcelId);

      if (parcelId) {
        // Fetch label using v2 labels endpoint with parcel ID
        const labelRes = await fetch(`https://panel.sendcloud.sc/api/v2/labels/${parcelId}`, {
          headers: { "Authorization": `Basic ${credentials}` },
        });
        console.log("Label fetch status:", labelRes.status);
        if (labelRes.ok) {
          const labelData = await labelRes.json();
          console.log("Label data:", JSON.stringify(labelData).slice(0, 300));
          labelPrinterUrl = labelData?.label?.label_printer
            ?? labelData?.label?.normal_printer?.[0]
            ?? null;
        } else {
          const labelErr = await labelRes.text();
          console.error("Label fetch error:", labelErr);
        }
      }
    }
    console.log("Final label URL:", labelPrinterUrl);

    // Fetch PDF server-side to avoid Sendcloud auth requirement on the client
    let labelDataUrl: string | null = labelPrinterUrl;
    if (labelPrinterUrl) {
      const pdfRes = await fetch(labelPrinterUrl, {
        headers: { "Authorization": `Basic ${credentials}` },
      });
      console.log("PDF fetch status:", pdfRes.status);
      if (pdfRes.ok) {
        const pdfBytes = await pdfRes.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));
        labelDataUrl = `data:application/pdf;base64,${base64}`;
        console.log("PDF fetched successfully, size:", pdfBytes.byteLength);
      } else {
        console.error("PDF fetch failed, falling back to direct URL");
        labelDataUrl = labelPrinterUrl;
      }
    }

    const qrUrl = labelPrinterUrl;

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