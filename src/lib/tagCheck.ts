import { lookupFactoryCountry, type FactoryCountry } from "@/data/factoryCodes";
import { parseConverseCode } from "@/data/converseFactoryCodes";

export type TagVerdict = "match" | "mismatch" | "unrecognized_code" | "unsupported_brand" | "insufficient_data";

export interface TagCheckResult {
  verdict: TagVerdict;
  expectedCountry: string | null;
  statedCountry: string | null;
  summary: string;
}

const normaliseCountry = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^made in\s+/, "").replace(/[.,]+$/, "");

/**
 * Cross-checks a Nike style code's factory suffix against the country the
 * tag itself claims ("MADE IN X"). A mismatch is a signal to look closer,
 * not proof of anything — callers must present it that way.
 */
export function checkFactoryCode(input: {
  brand: string;
  factoryCode: string | null;
  statedCountry: string | null;
}): TagCheckResult {
  const { brand, factoryCode, statedCountry } = input;

  if (brand.trim().toLowerCase() !== "nike") {
    return {
      verdict: "unsupported_brand",
      expectedCountry: null,
      statedCountry,
      summary: "Factory-code cross-checking is currently Nike-only.",
    };
  }

  if (!factoryCode || !statedCountry) {
    return {
      verdict: "insufficient_data",
      expectedCountry: null,
      statedCountry,
      summary: "Not enough was read from the tag to run a check.",
    };
  }

  const expectedCountry = lookupFactoryCountry(factoryCode);
  if (!expectedCountry) {
    return {
      verdict: "unrecognized_code",
      expectedCountry: null,
      statedCountry,
      summary: `"${factoryCode}" isn't a factory code we recognise.`,
    };
  }

  const matches = normaliseCountry(statedCountry) === expectedCountry.toLowerCase();
  return {
    verdict: matches ? "match" : "mismatch",
    expectedCountry,
    statedCountry,
    summary: matches
      ? `Factory code "${factoryCode}" is consistent with ${expectedCountry}.`
      : `Factory code "${factoryCode}" points to ${expectedCountry}, but the tag says "${statedCountry}".`,
  };
}

/**
 * Same idea as checkFactoryCode but for Converse's number-prefix + letter-
 * suffix scheme (e.g. "9A" = Vietnam), which is structurally different from
 * Nike's pure-letter suffix.
 */
export function checkConverseCode(input: {
  brand: string;
  factoryCode: string | null;
  statedCountry: string | null;
}): TagCheckResult {
  const { brand, factoryCode, statedCountry } = input;

  if (brand.trim().toLowerCase() !== "converse") {
    return {
      verdict: "unsupported_brand",
      expectedCountry: null,
      statedCountry,
      summary: "Factory-code cross-checking isn't available for this brand.",
    };
  }

  if (!factoryCode || !statedCountry) {
    return {
      verdict: "insufficient_data",
      expectedCountry: null,
      statedCountry,
      summary: "Not enough was read from the tag to run a check.",
    };
  }

  const parsed = parseConverseCode(factoryCode);
  if (!parsed || !parsed.country) {
    return {
      verdict: "unrecognized_code",
      expectedCountry: null,
      statedCountry,
      summary: `"${factoryCode}" isn't a production code we recognise.`,
    };
  }

  const matches = normaliseCountry(statedCountry) === parsed.country.toLowerCase();
  return {
    verdict: matches ? "match" : "mismatch",
    expectedCountry: parsed.country,
    statedCountry,
    summary: matches
      ? `Production code "${factoryCode}" is consistent with ${parsed.country}.`
      : `Production code "${factoryCode}" points to ${parsed.country}, but the tag says "${statedCountry}".`,
  };
}

export interface TagVerificationResult {
  verified: boolean;
  productTitle: string | null;
  summary: string;
}

/**
 * The full v2 verdict: a universal search-based product-match (works for
 * any brand) as the primary signal, with the brand-specific factory-code
 * check (Nike, Converse only) layered on top as a veto — an explicit
 * mismatch withholds verification even if the style code was found online,
 * since that's a real red flag a search hit shouldn't paper over.
 */
export function runTagCheck(input: {
  brand: string;
  factoryCode: string | null;
  statedCountry: string | null;
  productMatch: { found: boolean; title: string | null };
}): TagVerificationResult {
  const brandLower = input.brand.trim().toLowerCase();
  let secondary: TagCheckResult | null = null;
  if (brandLower === "nike") {
    secondary = checkFactoryCode(input);
  } else if (brandLower === "converse") {
    secondary = checkConverseCode(input);
  }

  const mismatched = secondary?.verdict === "mismatch";
  const verified = input.productMatch.found && !mismatched;

  let summary: string;
  if (mismatched) {
    summary = secondary!.summary;
  } else if (!input.productMatch.found) {
    summary = "Couldn't confirm this style code against a trusted retailer.";
  } else {
    summary = input.productMatch.title
      ? `Matches a listed product: "${input.productMatch.title}".`
      : "Style code matches a known product.";
  }

  return { verified, productTitle: input.productMatch.title, summary };
}
