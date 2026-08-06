// Supabase Edge Function: send-campaign-email
// Admin-only broadcast to every signed-up user. Called from the "Internal
// Emails" tab in /admin -- title, message, and an optional image are
// supplied by the admin each time, not hardcoded here.
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

// Short "you've got a new message" alert -- the email is just a notice with
// a link, the actual content (title/body/image) lives in the in-platform
// message, not duplicated here.
function newMessageAlertHtml(firstName: string) {
  const name = firstName || "there";
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;"><tr><td align="center">
<table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#18181b;padding:24px 32px;text-align:center;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PrelovedKicks</span></td></tr>
<tr><td style="padding:32px;">
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hey ${name},</p>
<p style="margin:0 0 24px;font-size:15px;color:#18181b;line-height:1.6;">You've got a new message waiting for you on PrelovedKicks.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td align="center"><a href="${BASE_URL}/messages" style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:100px;text-decoration:none;">View message &rarr;</a></td></tr></table>
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
    const title: string = (body?.title ?? "").trim();
    const message: string = (body?.message ?? "").trim();
    const imageUrl: string | null = body?.image_url || null;
    const testEmail: string | undefined = body?.test_email;

    if (!title || !message) return json({ error: "title and message are required" }, 400);

    if (testEmail) {
      await supabaseAdmin.from("notifications").insert({
        user_id: user.id,
        type: "campaign",
        title,
        body: message,
        link: null,
        read: false,
        data: imageUrl ? { image_url: imageUrl } : {},
      });
      await sendEmail(testEmail, "You've got a new message on PrelovedKicks", newMessageAlertHtml(""), password);
      return json({ ok: true, sent: 1, mode: "test" });
    }

    let page = 1;
    let sent = 0;
    const failures: { email: string; error: string }[] = [];
    while (true) {
      const { data: userPage, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) return json({ error: "Failed to list users: " + listErr.message }, 500);
      if (!userPage.users.length) break;

      for (const u of userPage.users) {
        // In-platform message -- independent of the email send below, so it
        // still lands even if that user's email bounces.
        await supabaseAdmin.from("notifications").insert({
          user_id: u.id,
          type: "campaign",
          title,
          body: message,
          link: null,
          read: false,
          data: imageUrl ? { image_url: imageUrl } : {},
        });

        if (!u.email) continue;
        try {
          await sendEmail(u.email, "You've got a new message on PrelovedKicks", newMessageAlertHtml(""), password);
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
