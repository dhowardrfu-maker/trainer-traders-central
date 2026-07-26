// Claude vision image moderation. Returns { allowed: boolean, reason?: string }.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Require an authenticated caller — prevents anonymous abuse of ANTHROPIC_API_KEY
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
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

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) return json({ error: "AI not configured" }, 500);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
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
      return json({ allowed: true, reason: "moderation_unavailable" });
    }

    const data = await res.json();

    if (data?.stop_reason === "refusal") {
      return json({ allowed: true, reason: "moderation_unavailable" });
    }

    const raw = data?.content?.[0]?.text ?? "{}";

    let parsed: { allowed?: boolean; reason?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { allowed: true };
    }

    return json({
      allowed: parsed.allowed !== false,
      reason: parsed.reason ?? "",
    });
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
