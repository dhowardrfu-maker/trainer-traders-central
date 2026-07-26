// Nike style-code factory suffixes -> manufacturing country.
// The factory-code convention is Nike-specific; other brands aren't covered.
export type FactoryCountry = "Vietnam" | "China" | "Indonesia" | "India";

const VIETNAM = [
  "KW", "VO2MI", "V3", "VB", "VF", "VH", "VJ", "VJB", "VL", "VM",
  "VO1", "VO2", "VT2", "VT2M", "VTM", "VTZ", "VW1", "VW2", "VY",
];
const CHINA = ["APE", "LN", "QB", "QT", "SQ", "SZ", "XB", "XC", "XE", "XH", "Y3", "YS"];
const INDONESIA = ["IM", "IW", "IY", "J2", "JJS", "JV2", "QM", "RY", "TT"];
const INDIA = ["APC", "LU2", "LUC"];

export const NIKE_FACTORY_CODES: Record<string, FactoryCountry> = Object.fromEntries([
  ...VIETNAM.map((code) => [code, "Vietnam"] as const),
  ...CHINA.map((code) => [code, "China"] as const),
  ...INDONESIA.map((code) => [code, "Indonesia"] as const),
  ...INDIA.map((code) => [code, "India"] as const),
]);

export function lookupFactoryCountry(code: string): FactoryCountry | null {
  const key = code.trim().toUpperCase();
  return NIKE_FACTORY_CODES[key] ?? null;
}
