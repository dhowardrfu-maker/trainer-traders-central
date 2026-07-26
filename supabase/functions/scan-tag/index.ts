// Reads a sneaker's inside tag photo via the Lovable AI vision gateway to
// extract the style code, factory-code suffix, and stated country of origin,
// then checks the style code against a curated set of trusted retailer sites
// via Google Custom Search — this is the universal, brand-agnostic layer
// (works for any brand, not just Nike/Converse where a factory-code table
// exists). Fails CLOSED throughout — any read or search failure means
// "couldn't verify", never a fabricated result.
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

async function readTag(imageUrl: string): Promise<ReadResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return { readable: false, error: "ai_not_configured" };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You read sneaker tag labels for a resale marketplace (PrelovedKicks). Locate the inside tag/label in the photo. Find the style/article code line (e.g. \"FN7808-001\") and, if present on that same line, a short 2-4 letter factory-code suffix (e.g. \"VY\"). Also find any \"MADE IN ___\" text on the tag. If the tag is not clearly legible, or you cannot confidently read a field, set it to null and set readable to false rather than guessing. Respond ONLY with strict JSON in this exact shape: {\"readable\": boolean, \"styleCode\": string|null, \"factoryCode\": string|null, \"statedCountry\": string|null, \"confidence\": \"low\"|\"medium\"|\"high\"}.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Read this sneaker tag." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("AI gateway error", res.status, t);
    return { readable: false, error: "read_failed" };
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const cleaned = String(raw).replace(/```json|```/g, "").trim();

  let parsed: {
    readable?: boolean;
    styleCode?: string | null;
    factoryCode?: string | null;
    statedCountry?: string | null;
    confidence?: string;
  } = {};
  try {
    parsed = JSON.parse(cleaned);
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

// Normalises a style code for loose comparison — retailers format the same
// code inconsistently (dashes, spaces, case).
function normaliseCode(s: string): string {
  return s.toUpperCase().replace(/[\s-]/g, "");
}

async function searchStyleCode(styleCode: string): Promise<ProductMatch> {
  const API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const ENGINE_ID = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");
  if (!API_KEY || !ENGINE_ID) return { found: false, title: null, sourceUrl: null };

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${ENGINE_ID}&q=${encodeURIComponent(styleCode)}&num=5`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Custom Search error", res.status, await res.text());
      return { found: false, title: null, sourceUrl: null };
    }
    const data = await res.json();
    const items: Array<{ title?: string; link?: string; snippet?: string }> = data?.items ?? [];
    const target = normaliseCode(styleCode);

    for (const item of items) {
      const haystack = normaliseCode(`${item.title ?? ""} ${item.snippet ?? ""}`);
      if (haystack.includes(target)) {
        return { found: true, title: item.title ?? null, sourceUrl: item.link ?? null };
      }
    }
    return { found: false, title: null, sourceUrl: null };
  } catch (e) {
    console.error("Custom Search request failed", e);
    return { found: false, title: null, sourceUrl: null };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
