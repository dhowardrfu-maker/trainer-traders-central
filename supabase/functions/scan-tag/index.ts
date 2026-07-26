// Reads a sneaker's inside tag photo via Claude's vision API to
// extract the style code, factory-code suffix, and stated country of origin,
// then checks the style code against the open web via Claude's own web
// search tool — this is the universal, brand-agnostic layer (works for any
// brand, and for discontinued/vintage items on resale marketplaces and
// archives, not just current-stock retailers). Fails CLOSED throughout —
// any read or search failure means "couldn't verify", never a fabricated
// result.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    const ALLOWED_ORIGIN = Deno.env.get("SUPABASE_URL");
    if (!ALLOWED_ORIGIN || !imageUrl.startsWith(`${ALLOWED_ORIGIN}/storage/v1/`)) {
      return json({ error: "URL not permitted" }, 400);
    }

    const read = await readTag(imageUrl);
    if (!read.readable) {
      return json({ readable: false, error: read.error });
    }

    const productMatch = read.styleCode
      ? await searchStyleCode(read.styleCode)
      : { found: false, title: null, sourceUrl: null };

    return json({
      readable: true,
      styleCode: read.styleCode,
      factoryCode: read.factoryCode,
      statedCountry: read.statedCountry,
      confidence: read.confidence,
      productMatch,
    });
  } catch (e) {
    console.error(e);
    return json({ readable: false, error: "read_failed" });
  }
});

interface ReadResult {
  readable: boolean;
  error?: string;
  styleCode?: string | null;
  factoryCode?: string | null;
  statedCountry?: string | null;
  confidence?: string;
}

const READ_TAG_SCHEMA = {
  type: "object",
  properties: {
    readable: { type: "boolean" },
    styleCode: { type: ["string", "null"] },
    factoryCode: { type: ["string", "null"] },
    statedCountry: { type: ["string", "null"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["readable", "styleCode", "factoryCode", "statedCountry", "confidence"],
  additionalProperties: false,
};

async function readTag(imageUrl: string): Promise<ReadResult> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) return { readable: false, error: "ai_not_configured" };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      system:
        "You read sneaker tag labels for a resale marketplace (PrelovedKicks). Locate the inside tag/label in the photo. Find the style/article code line (e.g. \"FN7808-001\") and, if present on that same line, a short 2-4 letter factory-code suffix (e.g. \"VY\"). Also find any \"MADE IN ___\" text on the tag. If the tag is not clearly legible, or you cannot confidently read a field, set it to null and set readable to false rather than guessing.",
      output_config: { format: { type: "json_schema", schema: READ_TAG_SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Read this sneaker tag." },
            { type: "image", source: { type: "url", url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("Anthropic error", res.status, t);
    return { readable: false, error: "read_failed" };
  }

  const data = await res.json();

  if (data?.stop_reason === "refusal") {
    return { readable: false, error: "read_failed" };
  }

  const raw = data?.content?.[0]?.text ?? "";

  let parsed: {
    readable?: boolean;
    styleCode?: string | null;
    factoryCode?: string | null;
    statedCountry?: string | null;
    confidence?: string;
  } = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { readable: false, error: "read_failed" };
  }

  if (parsed.readable === false) return { readable: false };

  return {
    readable: true,
    styleCode: parsed.styleCode ?? null,
    factoryCode: parsed.factoryCode ?? null,
    statedCountry: parsed.statedCountry ?? null,
    confidence: parsed.confidence ?? "low",
  };
}

interface ProductMatch {
  found: boolean;
  title: string | null;
  sourceUrl: string | null;
}

async function searchStyleCode(styleCode: string): Promise<ProductMatch> {
  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) return { found: false, title: null, sourceUrl: null };

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        tools: [
          { type: "web_search_20260209", name: "web_search", max_uses: 3, allowed_callers: ["direct"] },
        ],
        system:
          "You verify sneaker style/article codes for a resale marketplace (PrelovedKicks). Search the web — any source: current retailers, resale marketplaces (eBay, Grailed, StockX, GOAT), sneaker databases, forums, or archives, not just big-name current retailers, since some items are discontinued or vintage — to check whether the given style code corresponds to a real, identifiable sneaker product. If a first search doesn't turn up an exact match, try a more specific follow-up search before giving up. Respond with ONLY a single JSON object as your final message, no other text, no markdown fences: {\"found\": boolean, \"title\": string|null, \"sourceUrl\": string|null}. Set found to true only if you found genuine, specific evidence — not a guess.",
        messages: [
          { role: "user", content: `Style/article code: "${styleCode}". Is this a genuine, identifiable sneaker product?` },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic web search error", res.status, await res.text());
      return { found: false, title: null, sourceUrl: null };
    }

    const data = await res.json();
    if (data?.stop_reason === "refusal") return { found: false, title: null, sourceUrl: null };

    const textBlocks: Array<{ type: string; text?: string }> = data?.content ?? [];
    const lastText = [...textBlocks].reverse().find((b) => b.type === "text")?.text ?? "";
    const match = lastText.match(/\{[\s\S]*\}/);
    if (!match) return { found: false, title: null, sourceUrl: null };

    let parsed: { found?: boolean; title?: string | null; sourceUrl?: string | null } = {};
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      return { found: false, title: null, sourceUrl: null };
    }

    return {
      found: parsed.found === true,
      title: parsed.title ?? null,
      sourceUrl: parsed.sourceUrl ?? null,
    };
  } catch (e) {
    console.error("Claude web search request failed", e);
    return { found: false, title: null, sourceUrl: null };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
