ALTER TABLE public.listings
  ADD COLUMN retail_price_pence INT CHECK (retail_price_pence IS NULL OR retail_price_pence >= 100);

COMMENT ON COLUMN public.listings.retail_price_pence IS
  'Original retail price in pence, optionally entered by the seller. Used to compute Deal Score alongside the average price of other active listings for the same brand+model.';