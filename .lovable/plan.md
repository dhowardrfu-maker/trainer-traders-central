## Goal
Resolve all three open security scan findings without breaking the marketplace.

## 1. Orders — sellers seeing buyer QR / full address
- Drop the broad `Sellers can view their orders` SELECT policy on `public.orders`.
- Add a new SECURITY DEFINER function `public.get_my_sales()` returning only seller-safe columns (id, listing_id, buyer_id, seller_id, carrier, service_label, status, total_pence, price_pence, postage_pence, tracking_code, ship_to_name, ship_to_city, ship_to_postcode, created_at, updated_at) — no `qr_payload`, no full address line1/line2.
- Update `src/pages/Profile.tsx` to fetch buyer rows via the table and seller rows via `supabase.rpc('get_my_sales')`, then merge.

## 2. Realtime — deny-all blocking notifications
- Drop the deny-all policy on `realtime.messages`.
- Add a permissive SELECT policy for `authenticated` (postgres_changes payloads are still gated by table-level RLS on `messages` / `notifications`, so users only receive rows they're allowed to see).

## 3. Listing photos — public bucket
- Make the `listing-photos` bucket private.
- Replace the owner-only SELECT policy on `storage.objects` with one that allows reads when the photo's owning user has at least one active or sold listing referencing the file (path-prefix `{user_id}/...`). Owners can always read their own files.
- App-side:
  - `src/pages/Sell.tsx`: store the storage **path** in `listings.photos` (not the public URL); skip the moderation call's `imageUrl` and instead create a short signed URL to feed the edge function.
  - Add `src/lib/photo.ts` helper `resolvePhotoUrl(pathOrUrl)` that returns a signed URL (1 h) when given a storage path, or passes through a full URL (so existing static sample images keep working).
  - Add `src/hooks/useSignedPhotos.ts` for batched signing in lists.
  - Update components that render `listing.photos[*]` to resolve via the helper: `ProductCard`, `ListingDetail`, `Search`, `Profile`, `EditListing`, `MessageThread`, `Messages`, `OrderConfirmation`.

## Migration order
Single migration containing: orders policy + RPC, realtime policy swap, storage bucket update + policy swap.

## Risks
- Existing real listings (none currently) with full URLs in `photos[]` would still resolve via passthrough.
- Signed URLs expire after 1 h; lists re-sign on mount, which is fine for SPA navigation.
