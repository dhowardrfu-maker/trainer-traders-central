import type { Listing } from "@/data/listings";

export interface DealScore {
  retailPence: number;
  averageUsedPence: number | null;
  /** How many *other* active listings of the same brand+model this average is based on. */
  comparableCount: number;
  percentBelowRetail: number;
  percentBelowAverage: number | null;
}

// Minimum number of *other* active listings of the same brand+model needed
// before we show an "average used price" — with only one data point the
// average is just that listing's price, which isn't a meaningful comparison.
// Kept at 1 (not higher) because marketplace liquidity is still low; a
// stricter threshold would mean Deal Score rarely has an average to show.
const MIN_OTHER_LISTINGS_FOR_AVERAGE = 1;

type ComparableListing = Pick<Listing, "id" | "brand" | "model" | "title" | "price">;

const normaliseModelKey = (l: ComparableListing): string =>
  `${l.brand}|${l.model ?? l.title}`.trim().toLowerCase();

/**
 * Computes Deal Score for a listing against a pool of other active listings
 * (e.g. everything already fetched for the homepage/search page, or a
 * small dedicated comparables query on the listing detail page — no photos
 * involved either way). Returns null if the listing has no retail price
 * set, since there's nothing to compare against.
 */
export function computeDealScore(listing: Listing, pool: ComparableListing[]): DealScore | null {
  if (!listing.retailPricePence || listing.retailPricePence <= 0) return null;

  const listingPricePence = Math.round(listing.price * 100);
  const retailPence = listing.retailPricePence;
  const percentBelowRetail = Math.round(((retailPence - listingPricePence) / retailPence) * 100);

  const key = normaliseModelKey(listing);
  const comparables = pool.filter(
    (l) => l.id !== listing.id && normaliseModelKey(l) === key
  );

  if (comparables.length < MIN_OTHER_LISTINGS_FOR_AVERAGE) {
    return {
      retailPence,
      averageUsedPence: null,
      comparableCount: comparables.length,
      percentBelowRetail,
      percentBelowAverage: null,
    };
  }

  const averageUsedPence = Math.round(
    comparables.reduce((sum, l) => sum + Math.round(l.price * 100), 0) / comparables.length
  );
  const percentBelowAverage = Math.round(
    ((averageUsedPence - listingPricePence) / averageUsedPence) * 100
  );

  return {
    retailPence,
    averageUsedPence,
    comparableCount: comparables.length,
    percentBelowRetail,
    percentBelowAverage,
  };
}