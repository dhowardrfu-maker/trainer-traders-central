import { Truck } from "lucide-react";

export type CarrierId = "royal_mail";

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
  },
];

const randomBlock = (len: number) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export const generateTrackingCode = (_carrier: CarrierId = "royal_mail"): string => {
  // Royal Mail tracked-style: AA123456789GB
  return `RM${randomBlock(2)}${Math.floor(Math.random() * 9e8 + 1e8)}GB`;
};

export const carrierLabel = (id: CarrierId): string =>
  CARRIERS.find((c) => c.id === id)?.name ?? id;
