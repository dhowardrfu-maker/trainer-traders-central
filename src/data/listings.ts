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
}

export const SAMPLE_LISTINGS: Listing[] = [
  { id: "1", title: "Air Max 90 'Cloud Grey'", brand: "Nike", sizeUk: 9, condition: "Very good", price: 65, image: trainer1, seller: { name: "alex_k", rating: 4.9 }, postedAgo: "2h" },
  { id: "2", title: "Samba OG Black", brand: "adidas", sizeUk: 8, condition: "Like new", price: 75, image: trainer2, seller: { name: "trnr_jay", rating: 5.0 }, postedAgo: "5h" },
  { id: "3", title: "Air Jordan 1 High 'Chicago'", brand: "Jordan", sizeUk: 10, condition: "Good", price: 140, image: trainer3, seller: { name: "kicks_uk", rating: 4.8 }, postedAgo: "1d" },
  { id: "4", title: "550 White / Green", brand: "New Balance", sizeUk: 7, condition: "Like new", price: 95, image: trainer4, seller: { name: "soleboutique", rating: 4.7 }, postedAgo: "3d" },
  { id: "5", title: "Dunk Low 'Panda'", brand: "Nike", sizeUk: 9.5, condition: "Very good", price: 85, image: trainer5, seller: { name: "mia.r", rating: 4.9 }, postedAgo: "6h" },
  { id: "6", title: "Yeezy Boost 350 'Sand'", brand: "adidas", sizeUk: 11, condition: "Good", price: 120, image: trainer6, seller: { name: "y_drops", rating: 4.6 }, postedAgo: "2d" },
  { id: "7", title: "Gel-Lyte III Blue", brand: "Asics", sizeUk: 8.5, condition: "Worn", price: 45, image: trainer7, seller: { name: "retro_runs", rating: 4.5 }, postedAgo: "4d" },
  { id: "8", title: "Chuck 70 Hi Parchment", brand: "Converse", sizeUk: 6, condition: "New with tags", price: 60, image: trainer8, seller: { name: "ellie.m", rating: 5.0 }, postedAgo: "1h" },
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
