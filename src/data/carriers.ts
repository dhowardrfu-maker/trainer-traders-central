import { Truck, Package, MapPin } from "lucide-react";

export type CarrierId = "royal_mail" | "evri" | "inpost";

export type ParcelSize = "small" | "medium" | "large" | "extra_large";

export interface CarrierOption {
  id: CarrierId;
  name: string;
  service: string;
  /** Price in pence for each supported parcel size. Carriers that don't support a size omit that key. */
  pricesBySize: Partial<Record<ParcelSize, number>>;
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
    pricesBySize: {
      small: 345,
      medium: 449,
      large: 599,
      extra_large: 799,
    },
    eta: "2–4 working days",
    description: "Print label at home and drop off at any Evri ParcelShop.",
    icon: Truck,
  },
  {
    id: "royal_mail",
    name: "Royal Mail",
    service: "Tracked 48",
    pricesBySize: {
      small: 304,
      medium: 463,
    },
    eta: "2–3 working days",
    description: "Get a QR code and have your label printed for free at any Post Office — no printer needed.",
    icon: Package,
  },
  {
    id: "inpost",
    name: "InPost",
    service: "Locker to Locker",
    pricesBySize: {
      small: 256,
      medium: 338,
      large: 465,
    },
    eta: "1–3 working days",
    description: "Drop off and collect at any InPost locker, 24/7.",
    icon: MapPin,
  },
];

/** Get the price in pence for a given carrier and parcel size, or null if unsupported. */
export const carrierPriceForSize = (carrierId: CarrierId, size: ParcelSize): number | null => {
  const carrier = CARRIERS.find((c) => c.id === carrierId);
  return carrier?.pricesBySize[size] ?? null;
};

/** Carriers that support a given parcel size, for building the buyer-facing picker. */
export const carriersForSize = (size: ParcelSize): CarrierOption[] =>
  CARRIERS.filter((c) => c.pricesBySize[size] != null);

/** Human-readable carrier name */
export const carrierLabel = (id: CarrierId | string): string =>
  CARRIERS.find((c) => c.id === id)?.name ?? id;

/** Sendcloud shipping method codes per carrier (small/medium/large/extra_large where supported) */
export const SENDCLOUD_CODES: Record<CarrierId, Partial<Record<ParcelSize, string>>> = {
  evri: {
    small: "hermes_c2c_gb:s2a/dropoff",
    medium: "hermes_c2c_gb:s2a/dropoff",
    large: "hermes_c2c_gb:s2a/dropoff",
    extra_large: "hermes_c2c_gb:s2a/dropoff",
  },
  royal_mail: {
    small: "royal_mailv2:tracked_48/kg=0-2,size=s,labelless",
    medium: "royal_mailv2:tracked_48/kg=0-2,size=m,labelless",
  },
  inpost: {
    small: "inpost:locker_to_locker/size=s",
    medium: "inpost:locker_to_locker/size=m",
    large: "inpost:locker_to_locker/size=l",
  },
};