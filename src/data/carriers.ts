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

/**
 * Carriers not currently offered to buyers, kept here for re-enabling later:
 *
 * - royal_mail: Sendcloud's Royal Mail integration currently returns
 *   "Carrier returned error: service unavailable, please contact carrier
 *   support" on label generation. Needs Sendcloud support to resolve.
 *
 * - inpost: "Locker to Locker" requires a specific InPost locker
 *   (to_service_point) to be selected at checkout, which needs a
 *   locker-finder UI (Sendcloud service points API) — not yet built.
 *   Sendcloud currently rejects label creation with "A service point is
 *   required for the selected shipping method."
 */
const ROYAL_MAIL: CarrierOption = {
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
};

const INPOST: CarrierOption = {
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
};

/** Carriers currently offered to buyers at checkout. */
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
];

/** All known carriers, including ones not currently offered (for price/label lookups on existing orders). */
const ALL_CARRIERS: CarrierOption[] = [...CARRIERS, ROYAL_MAIL, INPOST];

/** Get the price in pence for a given carrier and parcel size, or null if unsupported. */
export const carrierPriceForSize = (carrierId: CarrierId, size: ParcelSize): number | null => {
  const carrier = ALL_CARRIERS.find((c) => c.id === carrierId);
  return carrier?.pricesBySize[size] ?? null;
};

/** Carriers that support a given parcel size, for building the buyer-facing picker. */
export const carriersForSize = (size: ParcelSize): CarrierOption[] =>
  CARRIERS.filter((c) => c.pricesBySize[size] != null);

/** Human-readable carrier name */
export const carrierLabel = (id: CarrierId | string): string =>
  ALL_CARRIERS.find((c) => c.id === id)?.name ?? id;

/**
 * Sendcloud shipping_option_code per carrier + parcel size, confirmed via
 * the v3 /compat/shipping-options endpoint for this account.
 * Royal Mail and InPost codes are kept here for when each is re-enabled,
 * even though neither is currently offered to buyers.
 */
export const SENDCLOUD_CODES: Record<CarrierId, Partial<Record<ParcelSize, string>>> = {
  evri: {
    small: "hermes_c2c_gb:s2a/dropoff",
    medium: "hermes_c2c_gb:s2a/dropoff",
    large: "hermes_c2c_gb:s2a/dropoff",
    extra_large: "hermes_c2c_gb:s2a/dropoff",
  },
  royal_mail: {
    small: "royal_mailv2:tracked_48/size=s,labelless",
    medium: "royal_mailv2:tracked_48/size=m,labelless",
  },
  inpost: {
    small: "inpost_gb:l2l/size=s",
    medium: "inpost_gb:l2l/size=m",
    large: "inpost_gb:l2l/size=l",
  },
};