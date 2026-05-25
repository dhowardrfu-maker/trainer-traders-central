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

export const SAMPLE_LISTINGS: Listing[] = [];

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