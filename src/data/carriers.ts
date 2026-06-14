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

/**
 * Sendcloud "ship_with" config per carrier + parcel size.
 * Evri uses a shipping_option_code (string). Royal Mail and InPost use
 * shipping_method_id (numeric), confirmed via Sendcloud's
 * /api/v2/shipping_methods endpoint for this account.
 */
export type ShipWithConfig =
  | { type: "shipping_option_code"; code: string }
  | { type: "shipping_method_id"; id: number };

export const SENDCLOUD_SHIP_WITH: Record<CarrierId, Partial<Record<ParcelSize, ShipWithConfig>>> = {
  evri: {
    small: { type: "shipping_option_code", code: "hermes_c2c_gb:s2a/dropoff" },
    medium: { type: "shipping_option_code", code: "hermes_c2c_gb:s2a/dropoff" },
    large: { type: "shipping_option_code", code: "hermes_c2c_gb:s2a/dropoff" },
    extra_large: { type: "shipping_option_code", code: "hermes_c2c_gb:s2a/dropoff" },
  },
  royal_mail: {
    // Royal Mail Tracked 48 QR — Small Parcel (0-2kg)
    small: { type: "shipping_method_id", id: 29986 },
    // Royal Mail Tracked 48 QR — Medium Parcel (0-5kg)
    medium: { type: "shipping_method_id", id: 29985 },
  },
  inpost: {
    // InPost Locker to Locker — Small
    small: { type: "shipping_method_id", id: 27221 },
    // InPost Locker to Locker — Medium
    medium: { type: "shipping_method_id", id: 27222 },
    // InPost Locker to Locker — Large
    large: { type: "shipping_method_id", id: 27223 },
  },
};