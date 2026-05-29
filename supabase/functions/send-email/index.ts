// Supabase Edge Function: send-email
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZOHO_HOST = "smtp.zoho.eu";
const ZOHO_PORT = 465;
const ZOHO_USER = "support@prelovedkicks.co.uk";
const FROM_NAME = "PrelovedKicks";
const BASE_URL = "https://www.prelovedkicks.co.uk";

async function sendEmail(to: string, subject: string, html: string, password: string) {
  const encoder = new TextEncoder();
  const conn = await Deno.connectTls({ hostname: ZOHO_HOST, port: ZOHO_PORT });
  const read = async () => {
    const buf = new Uint8Array(4096);
    const n = await conn.read(buf);
    return new TextDecoder().decode(buf.subarray(0, n ?? 0));
  };
  const write = async (s: string) => await conn.write(encoder.encode(s + "\r\n"));
  await read();
  await write("EHLO prelovedkicks.co.uk");
  await read();
  await write("AUTH LOGIN");
  await read();
  await write(btoa(ZOHO_USER));
  await read();
  await write(btoa(password));
  const authResp = await read();
  if (!authResp.startsWith("235")) throw new Error("SMTP auth failed: " + authResp);
  await write(`MAIL FROM:<${ZOHO_USER}>`);
  await read();
  await write(`RCPT TO:<${to}>`);
  await read();
  await write("DATA");
  await read();
  const message = [`From: ${FROM_NAME} <${ZOHO_USER}>`, `To: ${to}`, `Subject: ${subject}`, `MIME-Version: 1.0`, `Content-Type: text/html; charset=UTF-8`, ``, html, `.`].join("\r\n");
  await write(message);
  const sendResp = await read();
  if (!sendResp.startsWith("250")) throw new Error("SMTP send failed: " + sendResp);
  await write("QUIT");
  conn.close();
}

function wrapper(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center"><table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;"><tr><td style="background:#18181b;padding:24px 32px;text-align:center;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PrelovedKicks</span></td></tr><tr><td style="padding:32px;">${content}</td></tr><tr><td style="background:#f4f4f5;padding:20px 32px;text-align:center;"><p style="margin:0;font-size:12px;color:#a1a1aa;">© ${new Date().getFullYear()} PrelovedKicks · <a href="${BASE_URL}/terms" style="color:#a1a1aa;">Terms</a> · <a href="${BASE_URL}/privacy" style="color:#a1a1aa;">Privacy</a></p></td></tr></table></td></tr></table></body></html>`;
}

function btn(href: string, label: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td align="center"><a href="${href}" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:100px;text-decoration:none;">${label}</a></td></tr></table>`;
}

function offerReceivedHtml(p: { sellerName: string; buyerName: string; amountGbp: string; listingTitle: string; brand: string; offerId: string }) {
  return wrapper(`<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">You have a new offer!</h1><p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${p.sellerName}, ${p.buyerName} has made an offer on your listing.</p><table width="100%" style="background:#f4f4f5;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#71717a;">${p.brand}</p><p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${p.listingTitle}</p><p style="margin:0;font-size:22px;font-weight:700;color:#18181b;">Offer: £${p.amountGbp}</p></td></tr></table><p style="margin:0 0 24px;font-size:14px;color:#71717a;">Head to your Offers tab to accept or decline.</p>${btn(`${BASE_URL}/profile?tab=offers`, "View offer")}<p style="margin:0;font-size:13px;color:#71717a;text-align:center;">Questions? Reply to this email.</p>`);
}

function offerAcceptedHtml(p: { buyerName: string; amountGbp: string; listingTitle: string; brand: string; listingId: string; offerId: string }) {
  return wrapper(`<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Your offer was accepted! 🎉</h1><p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${p.buyerName}, great news — the seller accepted your offer.</p><table width="100%" style="background:#f4f4f5;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#71717a;">${p.brand}</p><p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${p.listingTitle}</p><p style="margin:0;font-size:22px;font-weight:700;color:#18181b;">Your offer: £${p.amountGbp}</p></td></tr></table><p style="margin:0 0 24px;font-size:14px;color:#71717a;">Complete your purchase before the offer expires.</p>${btn(`${BASE_URL}/checkout/${p.listingId}?offer=${p.offerId}`, "Complete purchase")}<p style="margin:0;font-size:13px;color:#71717a;text-align:center;">Questions? Reply to this email.</p>`);
}

function disputeRaisedHtml(p: { sellerName: string; description: string; orderId: string }) {
  return wrapper(`<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">A buyer has raised an issue</h1><p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${p.sellerName}, a buyer has opened a dispute on one of your orders.</p><table width="100%" style="background:#fff8e6;border:1px solid #f5d76e;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;color:#71717a;">Buyer's description</p><p style="margin:0;font-size:14px;color:#18181b;line-height:1.6;">${p.description}</p></td></tr></table><p style="margin:0 0 24px;font-size:14px;color:#71717a;">Please review and choose to issue a refund or request a return.</p>${btn(`${BASE_URL}/order/${p.orderId}`, "View dispute")}<p style="margin:0;font-size:13px;color:#71717a;text-align:center;">If you need help, reply to this email.</p>`);
}

function saleCompletedHtml(p: { sellerName: string; amountGbp: string; listingTitle: string; brand: string; orderId: string }) {
  return wrapper(`<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Sale completed — payout on its way! 🎉</h1><p style="margin:0 0 24px;color:#71717a;font-size:15px;">Hi ${p.sellerName}, your item has been delivered and your payout is being processed.</p><table width="100%" style="background:#f4f4f5;border-radius:12px;padding:16px;margin-bottom:24px;" cellpadding="0" cellspacing="0"><tr><td><p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:#71717a;">${p.brand}</p><p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">${p.listingTitle}</p><p style="margin:0;font-size:22px;font-weight:700;color:#18181b;">Payout: £${p.amountGbp}</p></td></tr></table><p style="margin:0 0 24px;font-size:14px;color:#71717a;">Payouts typically arrive within 2 business days.</p>${btn(`${BASE_URL}/order/${p.orderId}`, "View order")}<p style="margin:0;font-size:13px;color:#71717a;text-align:center;">Questions? Reply to this email.</p>`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
  if (!password) return json({ error: "SMTP password not configured" }, 500);
  try {
    const body = await req.json();
    const { type, to, ...params } = body;
    if (!type || !to) return json({ error: "Missing type or to" }, 400);
    let html = "";
    let subject = "PrelovedKicks notification";
    if (type === "offer_received") { html = offerReceivedHtml(params); subject = `New offer on your listing — ${params.brand} ${params.listingTitle}`; }
    else if (type === "offer_accepted") { html = offerAcceptedHtml(params); subject = `Your offer was accepted — ${params.brand} ${params.listingTitle}`; }
    else if (type === "dispute_raised") { html = disputeRaisedHtml(params); subject = "A buyer has raised an issue with their order"; }
    else if (type === "sale_completed") { html = saleCompletedHtml(params); subject = `Sale complete — payout for ${params.brand} ${params.listingTitle} on its way`; }
    else return json({ error: "Unknown email type" }, 400);
    await sendEmail(to, subject, html, password);
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}