import trainer1 from "@/assets/trainer-1.jpg";
import trainer2 from "@/assets/trainer-2.jpg";
import trainer3 from "@/assets/trainer-3.jpg";
import trainer4 from "@/assets/trainer-4.jpg";
import trainer5 from "@/assets/trainer-5.jpg";
import trainer6 from "@/assets/trainer-6.jpg";
import trainer7 from "@/assets/trainer-7.jpg";
import trainer8 from "@/assets/trainer-8.jpg";

export type Condition = "New with tags" | "Like new" | "Very good" | "Good" | "Worn";

export interface Listing {
  id: string;
  title: string;
  brand: string;
  sizeUk: number;
  condition: Condition;
  price: number;
  image: string;
  seller: { name: string; rating: number };
  postedAgo: string;
  isSample?: boolean;
}

export const SAMPLE_LISTINGS: Listing[] = [
  { id: "s1", title: "Air Max 90 'Cloud Grey'", brand: "Nike", sizeUk: 9, condition: "Very good", price: 65, image: trainer1, seller: { name: "alex_k", rating: 4.9 }, postedAgo: "2h", isSample: true },
  { id: "s2", title: "Samba OG Black", brand: "adidas", sizeUk: 8, condition: "Like new", price: 75, image: trainer2, seller: { name: "trnr_jay", rating: 5.0 }, postedAgo: "5h", isSample: true },
  { id: "s3", title: "Air Jordan 1 High 'Chicago'", brand: "Jordan", sizeUk: 10, condition: "Good", price: 140, image: trainer3, seller: { name: "kicks_uk", rating: 4.8 }, postedAgo: "1d", isSample: true },
  { id: "s4", title: "550 White / Green", brand: "New Balance", sizeUk: 7, condition: "Like new", price: 95, image: trainer4, seller: { name: "soleboutique", rating: 4.7 }, postedAgo: "3d", isSample: true },
  { id: "s5", title: "Dunk Low 'Panda'", brand: "Nike", sizeUk: 9.5, condition: "Very good", price: 85, image: trainer5, seller: { name: "mia.r", rating: 4.9 }, postedAgo: "6h", isSample: true },
  { id: "s6", title: "Yeezy Boost 350 'Sand'", brand: "adidas", sizeUk: 11, condition: "Good", price: 120, image: trainer6, seller: { name: "y_drops", rating: 4.6 }, postedAgo: "2d", isSample: true },
  { id: "s7", title: "Gel-Lyte III Blue", brand: "Asics", sizeUk: 8.5, condition: "Worn", price: 45, image: trainer7, seller: { name: "retro_runs", rating: 4.5 }, postedAgo: "4d", isSample: true },
  { id: "s8", title: "Chuck 70 Hi Parchment", brand: "Converse", sizeUk: 6, condition: "New with tags", price: 60, image: trainer8, seller: { name: "ellie.m", rating: 5.0 }, postedAgo: "1h", isSample: true },
];

export const CATEGORIES = [
  { label: "All", emoji: "👟" },
  { label: "Nike" },
  { label: "adidas" },
  { label: "Jordan" },
  { label: "New Balance" },
  { label: "Yeezy" },
  { label: "Asics" },
  { label: "Converse" },
  { label: "Vans" },
  { label: "Puma" },
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
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
};

interface DbListingRow {
  id: string;
  title: string;
  brand: string;
  size_uk: number | string;
  condition: string;
  price_pence: number;
  photos: string[];
  created_at: string;
  profile?: { username: string | null; display_name: string | null } | null;
}

export const mapDbListing = (row: DbListingRow): Listing => ({
  id: row.id,
  title: row.title,
  brand: row.brand,
  sizeUk: Number(row.size_uk),
  condition: conditionMap[row.condition] ?? "Good",
  price: Math.round(row.price_pence / 100),
  image: row.photos?.[0] ?? "",
  seller: {
    name: row.profile?.username ?? row.profile?.display_name ?? "seller",
    rating: 5.0,
  },
  postedAgo: formatPostedAgo(row.created_at),
});
