-- 1) Offers: validate seller_id matches the listing's seller and listing is active.
DROP POLICY IF EXISTS "Buyers can create offers" ON public.offers;

CREATE POLICY "Buyers can create offers"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND auth.uid() <> seller_id
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = offers.listing_id
      AND l.seller_id = offers.seller_id
      AND l.status = 'active'
  )
);

-- 2) Messages: drop the stray duplicate SELECT policy referencing realtime-only column.
DROP POLICY IF EXISTS "Authenticated postgres_changes only" ON public.messages;