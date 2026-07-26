// Converse style-code manufacturing codes: a numeric country prefix plus a
// factory-letter suffix (structurally different from Nike's pure-letter
// suffix — see factoryCodes.ts). Corroborated across two independent
// sources (different languages, years apart): a country digit followed by
// a factory letter, e.g. "6X" = Indonesia, Tangerang factory.
export type ConverseCountry = "Indonesia" | "Vietnam" | "China" | "India";

const COUNTRY_PREFIX: Record<string, ConverseCountry> = {
  "6": "Indonesia",
  "9": "Vietnam",
  "7": "China",
  "2": "India",
};

// Factory-letter -> city, only well-corroborated for Indonesia. Kept for
// display context; the country-level check is what drives the verdict.
const INDONESIA_FACTORIES: Record<string, string> = {
  X: "Tangerang",
  K: "Bogor",
  C: "Purwakarta",
  Y: "Sukabumi",
};

export interface ConverseCodeParts {
  prefix: string;
  letters: string;
  country: ConverseCountry | null;
  factoryCity: string | null;
}

/**
 * Splits a Converse production code like "9A" or "6X" into its country
 * prefix digit and factory letter(s), and resolves the country.
 */
export function parseConverseCode(code: string): ConverseCodeParts | null {
  const trimmed = code.trim().toUpperCase();
  const match = trimmed.match(/^(\d)([A-Z]+)$/);
  if (!match) return null;
  const [, prefix, letters] = match;
  const country = COUNTRY_PREFIX[prefix] ?? null;
  const factoryCity = prefix === "6" ? INDONESIA_FACTORIES[letters] ?? null : null;
  return { prefix, letters, country, factoryCity };
}
