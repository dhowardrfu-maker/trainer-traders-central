DROP POLICY IF EXISTS "Buyers can update their own reviews" ON public.reviews;

CREATE POLICY "Buyers can update their own reviews"
ON public.reviews
FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = reviews.order_id
      AND o.buyer_id = auth.uid()
      AND o.seller_id = reviews.seller_id
  )
);