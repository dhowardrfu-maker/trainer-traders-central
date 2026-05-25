import { Truck } from "lucide-react";

export type CarrierId = "royal_mail" | "evri";

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
    id: "evri",
    name: "Evri",
    service: "Standard Delivery",
    pricePence: 345,
    eta: "2–4 working days",
    description: "Print label at home and drop off at any Evri ParcelShop.",
    icon: Truck,
  },
];

/** Human-readable carrier name — gracefully handles legacy royal_mail DB values */
export const carrierLabel = (id: CarrierId | string): string => {
  if (id === "royal_mail") return "Evri"; // legacy orders stored royal_mail; we now ship via Evri
  return CARRIERS.find((c) => c.id === id)?.name ?? "Evri";
};

/** Sendcloud shipping method code for Evri Standard Delivery (dropoff) */
export const EVRI_SENDCLOUD_CODE = "hermes_c2c_gb:s2a/dropoff";