// Mirrors the tiers computed server-side in create_order (see the
// 20260911180000 migration) — this copy is display-only, the real fee is
// always worked out in the database from the listing's actual price.
export const SHIPPING_PROTECTION_MIN_ITEM_PENCE = 2000; // £20

export const shippingProtectionFeePence = (itemPence: number): number => {
  if (itemPence <= SHIPPING_PROTECTION_MIN_ITEM_PENCE) return 0;
  if (itemPence <= 7500) return 300;
  if (itemPence <= 15000) return 500;
  return 750;
};
