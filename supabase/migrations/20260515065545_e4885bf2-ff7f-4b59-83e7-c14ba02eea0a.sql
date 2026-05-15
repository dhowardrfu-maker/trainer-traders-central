-- 1. Orders: drop broad seller SELECT policy
DROP POLICY IF EXISTS "Sellers can view their orders" ON public.orders;

-- Safe seller view via RPC (excludes qr_payload + full address line1/line2)
CREATE OR REPLACE FUNCTION public.get_my_sales()
RETURNS TABLE (
  id uuid,
  listing_id uuid,
  buyer_id uuid,
  seller_id uuid,
  carrier carrier,
  service_label text,
  status order_status,
  total_pence integer,
  price_pence integer,
  postage_pence integer,
  tracking_code text,
  ship_to_name text,
  ship_to_city text,
  ship_to_postcode text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.listing_id, o.buyer_id, o.seller_id, o.carrier, o.service_label,
         o.status, o.total_pence, o.price_pence, o.postage_pence, o.tracking_code,
         o.ship_to_name, o.ship_to_city, o.ship_to_postcode, o.created_at, o.updated_at
  FROM public.orders o
  WHERE o.seller_id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_sales() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_sales() TO authenticated;

-- Sellers still need to update tracking/status — add a tighter SELECT policy limited to non-sensitive use:
-- Keep update policy as-is; add a narrow seller SELECT for id only (for updates) — actually UPDATE with USING clause already permits write without SELECT visibility, so no select policy needed.

-- 2. Realtime: replace deny-all with authenticated read (table-level RLS still gates row contents)
DROP POLICY IF EXISTS "Deny all realtime broadcast by default" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to realtime"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Storage: make bucket private + scoped read policy
UPDATE storage.buckets SET public = false WHERE id = 'listing-photos';

-- Drop any existing select policies on listing-photos
DROP POLICY IF EXISTS "Owners can read their listing photos" ON storage.objects;
DROP POLICY IF EXISTS "Listing photos are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public can read listing photos" ON storage.objects;

-- Allow reads when the file belongs to a user who has the file referenced by an active/sold listing
CREATE POLICY "Read photos for active or sold listings"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'
    AND EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.status IN ('active','sold')
        AND l.seller_id::text = (storage.foldername(name))[1]
        AND name = ANY (
          SELECT regexp_replace(p, '^https?://[^/]+/storage/v1/object/(public|sign)/listing-photos/', '')
          FROM unnest(l.photos) AS p
        )
    )
  );

-- Owners can always read/manage their own files
CREATE POLICY "Owners can read their photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );