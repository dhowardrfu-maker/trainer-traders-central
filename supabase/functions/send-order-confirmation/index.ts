import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZOHO_HOST = "smtp.zoho.eu";
const ZOHO_PORT = 465;
const ZOHO_USER = "support@prelovedkicks.co.uk";
const FROM_NAME = "PrelovedKicks";

async function sendEmail(to: string, subject: string, html: string, password: string) {
  const encoder = new TextEncoder();

  const conn = await Deno.connectTls({
    hostname: ZOHO_HOST,
    port: ZOHO_PORT,
  });

  const read = async () => {
    const buf = new Uint8Array(1024);
    const n = await conn.read(buf);
    return new TextDecoder().decode(buf.subarray(0, n ?? 0));
  };

  const write = async (s: string) => {
    await conn.write(encoder.encode(s + "\r\n"));
  };

  await read(); // 220 greeting
  await write(`EHLO smtp.zoho.eu`);
  await read(); // EHLO response

  // AUTH LOGIN
  await write("AUTH LOGIN");
  await read(); // 334 username prompt
  await write(btoa(ZOHO_USER));
  await read(); // 334 password prompt
  await write(btoa(password));
  const authResp = await read();
  if (!authResp.startsWith("235")) throw new Error("SMTP auth failed: " + authResp);

  await write(`MAIL FROM:<${ZOHO_USER}>`);
  await read();
  await write(`RCPT TO:<${to}>`);
  await read();
  await write("DATA");
  await read();

  const message = [
    `From: ${FROM_NAME} <${ZOHO_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=UTF-8`,
    ``,
    html,
    `.`,
  ].join("\r\n");

  await write(message);
  const sendResp = await read();
  if (!sendResp.startsWith("250")) throw new Error("SMTP send failed: " + sendResp);

  await write("QUIT");
  conn.close();
}

function orderConfirmationHtml(params: {
  buyerName: string;
  orderId: string;
  listingTitle: string;
  brand: string;
  sizeUk: string;
  condition: string;
  itemPence: number;
  postagePence: number;
  protectionPence: number;
  totalPence: number;
  shipToName: string;
  shipToLine1: string;
  shipToLine2: string | null;
  shipToCity: string;
  shipToPostcode: string;
}) {
  const fmt = (p: number) => `£${(p / 100).toFixed(2)}`;
  const orderUrl = `https://www.prelovedkicks.co.uk/order/${params.orderId}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#18181b;padding:24px 32px;text-align:center;">
            <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PrelovedKicks</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Order confirmed!</h1>
            <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${params.buyerName}, your payment was successful and your order is on its way.</p>

            <!-- Item -->
            <table width="100%" style="background:#f4f4f5;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;">${params.brand}</p>
                  <p style="margin:0 0 4px;font-size:16px;font-weight:600;color:#18181b;">${params.listingTitle}</p>
                  <p style="margin:0;font-size:13px;color:#71717a;">UK ${params.sizeUk} · ${params.condition}</p>
                </td>
              </tr>
            </table>

            <!-- Price breakdown -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#71717a;">Item</td>
                <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${fmt(params.itemPence)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#71717a;">Postage</td>
                <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${fmt(params.postagePence)}</td>
              </tr>
              <tr>
                <td style="padding:6px 0;font-size:14px;color:#71717a;">Buyer protection</td>
                <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:500;text-align:right;">${fmt(params.protectionPence)}</td>
              </tr>
              <tr>
                <td colspan="2" style="border-top:1px solid #e4e4e7;padding-top:12px;"></td>
              </tr>
              <tr>
                <td style="font-size:16px;font-weight:700;color:#18181b;">Total paid</td>
                <td style="font-size:16px;font-weight:700;color:#18181b;text-align:right;">${fmt(params.totalPence)}</td>
              </tr>
            </table>

            <!-- Delivery address -->
            <table width="100%" style="background:#f4f4f5;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0">
              <tr><td>
                <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;">Delivery address</p>
                <p style="margin:0;font-size:14px;color:#18181b;line-height:1.6;">
                  ${params.shipToName}<br>
                  ${params.shipToLine1}<br>
                  ${params.shipToLine2 ? params.shipToLine2 + "<br>" : ""}
                  ${params.shipToCity}<br>
                  ${params.shipToPostcode}
                </p>
              </td></tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td align="center">
                  <a href="${orderUrl}" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:100px;text-decoration:none;">View your order</a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#71717a;text-align:center;">You have 48 hours from delivery to raise any issues. Questions? Reply to this email.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f5;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#a1a1aa;">© ${new Date().getFullYear()} PrelovedKicks · <a href="https://www.prelovedkicks.co.uk/terms" style="color:#a1a1aa;">Terms</a> · <a href="https://www.prelovedkicks.co.uk/privacy" style="color:#a1a1aa;">Privacy</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
  if (!password) return json({ error: "SMTP password not configured" }, 500);

  try {
    const { order_id } = await req.json();
    if (!order_id) return json({ error: "Missing order_id" }, 400);

    // Fetch order with listing and buyer details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select(`
        id, price_pence, postage_pence, total_pence,
        ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode,
        listings (title, brand, size_uk, condition),
        buyer:profiles!orders_buyer_id_fkey (username),
        buyer_auth:buyer_id
      `)
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) return json({ error: "Order not found" }, 404);

    // Get buyer email from auth.users
    const { data: { user }, error: userErr } = await supabase.auth.admin.getUserById(
      order.buyer_auth as string
    );

    if (userErr || !user?.email) return json({ error: "Buyer email not found" }, 404);

    const listing = order.listings as { title: string; brand: string; size_uk: string; condition: string };
    const buyerName = (order.buyer as { username: string })?.username ?? "there";
    const protectionPence = order.total_pence - order.price_pence - order.postage_pence;

    const html = orderConfirmationHtml({
      buyerName,
      orderId: order.id,
      listingTitle: listing.title,
      brand: listing.brand,
      sizeUk: listing.size_uk,
      condition: listing.condition,
      itemPence: order.price_pence,
      postagePence: order.postage_pence,
      protectionPence,
      totalPence: order.total_pence,
      shipToName: order.ship_to_name,
      shipToLine1: order.ship_to_line1,
      shipToLine2: order.ship_to_line2,
      shipToCity: order.ship_to_city,
      shipToPostcode: order.ship_to_postcode,
    });

    await sendEmail(
      user.email,
      `Order confirmed — ${listing.brand} ${listing.title}`,
      html,
      password
    );

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}