export const CONDITIONS = [
  { value: "new_with_tags", label: "New with tags", desc: "Brand new, never worn, tags on" },
  { value: "like_new", label: "Like new", desc: "Worn once or twice, no flaws" },
  { value: "very_good", label: "Very good", desc: "Light signs of wear" },
  { value: "good", label: "Good", desc: "Clear signs of use, still in shape" },
  { value: "worn", label: "Worn", desc: "Well-loved, visible flaws" },
] as const;

export const BRANDS = [
  "Nike", "adidas", "Jordan", "New Balance", "Yeezy", "Asics",
  "Converse", "Vans", "Puma", "Reebok", "Other",
] as const;

export const GENDERS = [
  { value: "mens", label: "Men's" },
  { value: "womens", label: "Women's" },
  { value: "unisex", label: "Unisex" },
  { value: "kids", label: "Kids" },
] as const;

// UK sizes — half sizes from 3 to 13
export const UK_SIZES: number[] = (() => {
  const sizes: number[] = [];
  for (let s = 3; s <= 13; s += 0.5) sizes.push(s);
  return sizes;
})();

// Approx UK -> EU conversion
export const ukToEu = (uk: number): number => Math.round((uk + 33) * 10) / 10;

export const conditionLabel = (v: string) =>
  CONDITIONS.find((c) => c.value === v)?.label ?? v;
