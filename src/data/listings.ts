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

  // IMPORTANT: allow null (prevents grey boxes)
  image: string | null;
  images?: string[];

  seller: { name: string; rating: number; id?: string };
  postedAgo: string;
  createdAt?: string;
  isSample?: boolean;
}

export const SAMPLE_LISTINGS: Listing[] = [
  {
    id: "s1",
    title: "Air Max 90 'Cloud Grey'",
    brand: "Nike",
    sizeUk: 9,
    condition: "Very good",
    gender: "mens",
    color: "Grey",
    price: 65,
    image: trainer1,
    images: [trainer1],
    seller: { name: "alex_k", rating: 4.9 },
    postedAgo: "2h",
    isSample: true,
  },
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

// normalise image array safely
const normalisePhotos = (photos: any): string[] => {
  if (!photos) return [];

  const arr = Array.isArray(photos) ? photos : [photos];

  return arr
    .filter(Boolean)
    .map(String)
    .filter((url) => url.startsWith("http"));
};

export const mapDbListing = (row: DbListingRow): Listing => {
  const photos = normalisePhotos(row.photos);

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

    // KEY FIX: NEVER EMPTY STRING
    image: photos.length > 0 ? photos[0] : null,
    images: photos,

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
