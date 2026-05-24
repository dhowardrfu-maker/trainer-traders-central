import trainer1 from "@/assets/trainer-1.jpg";
import trainer2 from "@/assets/trainer-2.jpg";
import trainer3 from "@/assets/trainer-3.jpg";
import trainer4 from "@/assets/trainer-4.jpg";
import trainer5 from "@/assets/trainer-5.jpg";
import trainer6 from "@/assets/trainer-6.jpg";
import trainer7 from "@/assets/trainer-7.jpg";
import trainer8 from "@/assets/trainer-8.jpg";

export type Condition =
  | "New with tags"
  | "Like new"
  | "Very good"
  | "Good"
  | "Worn";

export type Gender = "mens" | "womens" | "unisex" | "kids";

export interface Listing {
  id: string;
  title: string;
  brand: string;
  sizeUk: number;
  sizeEu?: number;
  condition: Condition;
  conditionRaw?: string;
  gender?: Gender;
  color?: string | null;
  description?: string | null;
  price: number;

  image: string;
  images?: string[];

  seller: { name: string; rating: number; id?: string };
  postedAgo: string;
  createdAt?: string;
  isSample?: boolean;
}

export const SAMPLE_LISTINGS: Listing[] = [
  { id: "s1", title: "Air Max 90 'Cloud Grey'", brand: "Nike", sizeUk: 9, condition: "Very good", gender: "mens", color: "Grey", price: 65, image: trainer1, images: [trainer1], seller: { name: "alex_k", rating: 4.9 }, postedAgo: "2h", isSample: true },
  { id: "s2", title: "Jordan 1 Retro High 'Chicago'", brand: "Jordan", sizeUk: 10, condition: "Like new", gender: "mens", color: "Red/White", price: 220, image: trainer2, images: [trainer2], seller: { name: "soleplug", rating: 4.8 }, postedAgo: "5h", isSample: true },
  { id: "s3", title: "Samba OG 'White Black'", brand: "adidas", sizeUk: 7, condition: "Good", gender: "unisex", color: "White", price: 55, image: trainer3, images: [trainer3], seller: { name: "vintagesole", rating: 4.7 }, postedAgo: "1d", isSample: true },
  { id: "s4", title: "New Balance 530 'Silver'", brand: "New Balance", sizeUk: 8, condition: "Very good", gender: "unisex", color: "Silver", price: 75, image: trainer4, images: [trainer4], seller: { name: "kicksldn", rating: 5.0 }, postedAgo: "2d", isSample: true },
  { id: "s5", title: "Dunk Low 'Panda'", brand: "Nike", sizeUk: 6, condition: "New with tags", gender: "womens", color: "Black/White", price: 130, image: trainer5, images: [trainer5], seller: { name: "rarefinds", rating: 4.9 }, postedAgo: "3d", isSample: true },
  { id: "s6", title: "Yeezy Boost 350 V2", brand: "adidas", sizeUk: 9, condition: "Worn", gender: "mens", color: "Cream", price: 140, image: trainer6, images: [trainer6], seller: { name: "boostking", rating: 4.6 }, postedAgo: "4d", isSample: true },
  { id: "s7", title: "Jordan 4 'Bred'", brand: "Jordan", sizeUk: 11, condition: "Very good", gender: "mens", color: "Black/Red", price: 260, image: trainer7, images: [trainer7], seller: { name: "jumpman23", rating: 4.9 }, postedAgo: "5d", isSample: true },
  { id: "s8", title: "New Balance 990v5", brand: "New Balance", sizeUk: 9, condition: "Like new", gender: "mens", color: "Grey", price: 165, image: trainer8, images: [trainer8], seller: { name: "dadshoes", rating: 5.0 }, postedAgo: "1w", isSample: true },
];

export const CATEGORIES = [
  { label: "All", emoji: "👟" },
  { label: "Nike" },
  { label: "adidas" },
  { label: "Jordan" },
  { label: "New Balance" },
];

const conditionMap: Record<string, Condition> = {
  new_with_tags: "New with tags",
  like_new: "Like new",
  very_good: "Very good",
  good: "Good",
  worn: "Worn",
};

export const formatPostedAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

interface DbListingRow {
  id: string;
  title: string;
  brand: string;
  size_uk: number | string;
  size_eu?: number | string | null;
  condition: string;
  gender?: string | null;
  color?: string | null;
  description?: string | null;
  price_pence: number;
  photos: string[] | string | null;
  created_at: string;
  seller_id?: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  } | null;
}

// Handles: array, JSON string array, plain string, null
const normalisePhotos = (photos: unknown): string[] => {
  if (!photos) return [];
  // Already an array
  if (Array.isArray(photos)) return photos.filter(Boolean).map(String);
  // String — try to JSON parse first
  if (typeof photos === "string") {
    const trimmed = photos.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
      } catch {
        // fall through to treat as single URL
      }
    }
    // Plain URL string
    return trimmed ? [trimmed] : [];
  }
  return [];
};

export const mapDbListing = (row: DbListingRow): Listing => {
  const photos = normalisePhotos(row.photos);
  const fallback = "/placeholder.svg";

  return {
    id: row.id,
    title: row.title,
    brand: row.brand,
    sizeUk: Number(row.size_uk),
    sizeEu: row.size_eu != null ? Number(row.size_eu) : undefined,
    condition: conditionMap[row.condition] ?? "Good",
    conditionRaw: row.condition,
    gender: (row.gender as Gender) ?? "unisex",
    color: row.color ?? null,
    description: row.description ?? null,
    price: Math.round(row.price_pence / 100),

    image: photos[0] || fallback,
    images: photos.length ? photos : [fallback],

    seller: {
      name:
        row.profile?.username ??
        row.profile?.display_name ??
        "seller",
      rating: 5.0,
      id: row.seller_id,
    },

    postedAgo: formatPostedAgo(row.created_at),
    createdAt: row.created_at,
  };
};