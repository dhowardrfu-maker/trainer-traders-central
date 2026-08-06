// Supabase Edge Function: send-campaign-email
// One-off admin broadcast to every signed-up user. Not exposed to the
// public app — must be triggered manually by a logged-in admin (e.g. via
// curl with an access token, or a temporary Admin dashboard button).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ZOHO_HOST = "smtp.zoho.eu";
const ZOHO_PORT = 465;
const ZOHO_USER = "support@prelovedkicks.co.uk";
const FROM_NAME = "PrelovedKicks";
const BASE_URL = "https://www.prelovedkicks.co.uk";
const HEADER_IMAGE_URL =
  "https://jwvybofahjxtldjjjdpo.supabase.co/storage/v1/object/public/marketing-assets/post1_60seconds_nobutton.png";

async function sendEmail(to: string, subject: string, html: string, password: string) {
  const encoder = new TextEncoder();
  const conn = await Deno.connectTls({ hostname: ZOHO_HOST, port: ZOHO_PORT });
  const read = async () => {
    let result = "";
    while (true) {
      const buf = new Uint8Array(4096);
      const n = await conn.read(buf);
      if (n === null) break;
      result += new TextDecoder().decode(buf.subarray(0, n));
      // SMTP multi-line replies use "250-" (hyphen) for continuation lines
      // and "250 " (space) for the final line. A single read() can return
      // only part of a multi-line EHLO response, desyncing every step after
      // it, so keep reading until the last line isn't a continuation.
      const lines = result.trim().split("\r\n");
      if (/^\d{3}-/.test(lines[lines.length - 1])) continue;
      break;
    }
    return result;
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

function speedListingHtml(firstName: string) {
  const name = firstName || "there";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td><img src="${HEADER_IMAGE_URL}" alt="I listed my trainers before this timer hit 60 seconds" width="560" style="display:block;width:100%;max-width:560px;height:auto;"></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hey ${name},</p>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;line-height:1.6;">Quick one — I timed myself listing a pair of trainers on PrelovedKicks the other day. <strong>47 seconds.</strong> Photo to live listing.</p>
<p style="margin:0 0 12px;font-size:15px;color:#18181b;">Here's the whole process:</p>
<ol style="margin:0 0 16px;padding-left:20px;color:#18181b;font-size:15px;line-height:1.8;">
<li>Snap a few photos</li>
<li>Our AI checks them for you — no guesswork on condition or authenticity</li>
<li>Set your price and post</li>
</ol>
<p style="margin:0 0 24px;font-size:15px;color:#18181b;line-height:1.6;">That's it. No forms, no faff. If you've got trainers sitting in a box doing nothing, they could be live in less time than it took to read this.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center"><a href="${BASE_URL}/sell" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:100px;text-decoration:none;">Start selling &rarr;</a></td></tr></table>
<p style="margin:0;font-size:13px;color:#71717a;text-align:center;">Questions? Just reply to this email.</p>
</td></tr>
<tr><td style="background:#f4f4f5;padding:20px 32px;text-align:center;"><p style="margin:0;font-size:12px;color:#a1a1aa;">&copy; ${new Date().getFullYear()} PrelovedKicks &middot; <a href="${BASE_URL}/terms" style="color:#a1a1aa;">Terms</a> &middot; <a href="${BASE_URL}/privacy" style="color:#a1a1aa;">Privacy</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  const password = Deno.env.get("ZOHO_SMTP_PASSWORD");
  if (!password) return json({ error: "SMTP password not configured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!callerProfile?.is_admin) return json({ error: "Admin only" }, 403);

  try {
    const body = await req.json().catch(() => ({}));
    const testEmail: string | undefined = body?.test_email;

    if (testEmail) {
      await sendEmail(testEmail, "I listed my trainers before this email finished loading", speedListingHtml(""), password);
      return json({ ok: true, sent: 1, mode: "test" });
    }

    // Real send: every signed-up user, using their profile display_name for a
    // personal greeting where available.
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, username");
    const nameByUserId = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name || p.username || ""]));

    let page = 1;
    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    while (true) {
      const { data: userPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) return json({ error: "Failed to list users: " + listErr.message }, 500);
      if (!userPage.users.length) break;

      for (const u of userPage.users) {
        if (!u.email) continue;
        const firstName = (nameByUserId.get(u.id) || "").split(" ")[0];
        try {
          await sendEmail(u.email, "I listed my trainers before this email finished loading", speedListingHtml(firstName), password);
          sent++;
        } catch (e) {
          failures.push({ email: u.email, error: String(e) });
        }
      }
      if (userPage.users.length < 200) break;
      page++;
    }

    return json({ ok: true, sent, failures });
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
