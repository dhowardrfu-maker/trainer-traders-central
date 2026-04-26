import { Truck, Package, Box } from "lucide-react";

export type CarrierId = "royal_mail" | "inpost" | "evri";

export interface CarrierOption {
  id: CarrierId;
  name: string;
  service: string;
  pricePence: number;
  eta: string;
  description: string;
  icon: typeof Truck;
  badge?: string;
}

export const CARRIERS: CarrierOption[] = [
  {
    id: "royal_mail",
    name: "Royal Mail",
    service: "Tracked 48",
    pricePence: 349,
    eta: "2–3 working days",
    description: "Drop at any Post Office or postbox using your QR code.",
    icon: Truck,
    badge: "Most popular",
  },
  {
    id: "inpost",
    name: "InPost",
    service: "Locker to Locker",
    pricePence: 299,
    eta: "1–2 working days",
    description: "Scan the QR at any InPost locker — open 24/7.",
    icon: Box,
  },
  {
    id: "evri",
    name: "Evri",
    service: "Standard Drop Off",
    pricePence: 279,
    eta: "3–5 working days",
    description: "Drop at 7,000+ ParcelShops. Cheapest option.",
    icon: Package,
    badge: "Cheapest",
  },
];

const PREFIXES: Record<CarrierId, string> = {
  royal_mail: "RM",
  inpost: "IN",
  evri: "EV",
};

const randomBlock = (len: number) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export const generateTrackingCode = (carrier: CarrierId): string => {
  const prefix = PREFIXES[carrier];
  if (carrier === "royal_mail") {
    // Royal Mail tracked-style: AA123456789GB
    return `${prefix}${randomBlock(2)}${Math.floor(Math.random() * 9e8 + 1e8)}GB`;
  }
  if (carrier === "inpost") {
    // InPost-style 24-char alphanum
    return `${prefix}${randomBlock(22)}`;
  }
  // Evri-style: H + 16 digits
  return `H${Math.floor(Math.random() * 9e15 + 1e15)}`;
};

export const carrierLabel = (id: CarrierId): string =>
  CARRIERS.find((c) => c.id === id)?.name ?? id;
