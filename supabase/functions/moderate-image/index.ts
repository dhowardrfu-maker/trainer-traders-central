// Claude vision image moderation.
//
// Two callers:
//  1. The browser, right after an upload: { imageUrl } -> { allowed, reason }.
//     The caller deletes the photo itself if it is rejected.
//  2. The database (storage trigger on listing-photos uploads), authenticated
//     with a service-role token: { bucket, path } -> the function signs the
//     object, moderates it and DELETES it when it is definitively rejected.
//     This is what stops people skipping moderation by uploading straight to
//     storage. Moderation outages fail open so sellers are never blocked.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SERVER_MODE_BUCKETS = ["listing-photos"];

// verify_jwt is on, so the platform has already checked this token's
// signature; here we only read which role it was issued for.
function jwtRole(authHeader: string): string | null {
  try {
    const payload = authHeader.replace("Bearer ", "").split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded))?.role ?? null;
  } catch {
    return null;
  }
}

type Verdict = { allowed: boolean; reason: string; unavailable: boolean };

async function classify(imageUrl: string, apiKey: string): Promise<Verdict> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 256,
      system:
        "You are an image moderator for a sneaker resale marketplace (PrelovedKicks). Reject only images that are NSFW, violent, hateful, contain personal IDs, or are clearly unrelated to footwear/clothing. Sneakers, trainers, shoeboxes, feet wearing trainers, and apparel are ALL allowed.",
      output_config: {
        format: {
          type: "json_schema",
          schema: {
            type: "object",
            properties: {
              allowed: { type: "boolean" },
              reason: { type: "string" },
            },
            required: ["allowed", "reason"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Is this image acceptable for a sneaker listing?" },
            { type: "image", source: { type: "url", url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Anthropic error", res.status, t);
    // Fail-open so uploads are not blocked by moderation outages.
    return { allowed: true, reason: "moderation_unavailable", unavailable: true };
  }

  const data = await res.json();

  if (data?.stop_reason === "refusal") {
    return { allowed: true, reason: "moderation_unavailable", unavailable: true };
  }

  const raw = data?.content?.[0]?.text ?? "{}";

  let parsed: { allowed?: boolean; reason?: string } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { allowed: true, reason: "moderation_unavailable", unavailable: true };
  }

  return { allowed: parsed.allowed !== false, reason: parsed.reason ?? "", unavailable: false };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require an authenticated caller — prevents anonymous abuse of ANTHROPIC_API_KEY
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  // ---- Server mode (storage trigger) -------------------------------------
  if (jwtRole(authHeader) === "service_role") {
    try {
      const { bucket, path, dry_run } = await req.json();
      if (
        typeof bucket !== "string" || !SERVER_MODE_BUCKETS.includes(bucket) ||
        typeof path !== "string" || !path || path.length > 300 || path.includes("..")
      ) {
        return json({ error: "bucket/path invalid" }, 400);
      }
      if (!ANTHROPIC_API_KEY) return json({ allowed: true, reason: "moderation_unavailable" });

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: signed, error: signErr } = await admin.storage
        .from(bucket)
        .createSignedUrl(path, 120);
      if (signErr || !signed?.signedUrl) {
        // Object already gone (e.g. the browser rejected and deleted it).
        return json({ allowed: true, reason: "object_not_found" });
      }

      const verdict = await classify(signed.signedUrl, ANTHROPIC_API_KEY);
      let removed = false;
      if (!verdict.allowed && !verdict.unavailable && !dry_run) {
        const { error: rmErr } = await admin.storage.from(bucket).remove([path]);
        removed = !rmErr;
        console.error(`Moderation removed ${bucket}/${path}: ${verdict.reason}${rmErr ? ` (remove failed: ${rmErr.message})` : ""}`);
      }
      return json({ allowed: verdict.allowed, reason: verdict.reason, removed });
    } catch (e) {
      console.error(e);
      return json({ allowed: true, reason: "moderation_error" });
    }
  }

  // ---- Browser mode ------------------------------------------------------
  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error: authErr } = await supa.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !data?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
  } catch {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { imageUrl } = await req.json();
    if (!imageUrl || typeof imageUrl !== "string") {
      return json({ error: "imageUrl required" }, 400);
    }

    // Allowlist: only signed URLs from this project's Supabase Storage may be moderated.
    const ALLOWED_ORIGIN = Deno.env.get("SUPABASE_URL");
    if (!ALLOWED_ORIGIN || !imageUrl.startsWith(`${ALLOWED_ORIGIN}/storage/v1/`)) {
      return json({ error: "URL not permitted" }, 400);
    }

    if (!ANTHROPIC_API_KEY) return json({ error: "AI not configured" }, 500);

    const verdict = await classify(imageUrl, ANTHROPIC_API_KEY);
    return json({ allowed: verdict.allowed, reason: verdict.reason });
  } catch (e) {
    console.error(e);
    return json({ allowed: true, reason: "moderation_error" });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
