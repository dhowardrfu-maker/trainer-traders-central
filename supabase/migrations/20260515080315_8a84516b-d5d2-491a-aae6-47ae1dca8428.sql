
CREATE OR REPLACE FUNCTION public.enforce_review_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_id <> OLD.order_id
     OR NEW.seller_id <> OLD.seller_id
     OR NEW.buyer_id <> OLD.buyer_id THEN
    RAISE EXCEPTION 'Cannot reassign a review to a different order, seller, or buyer';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reviews_enforce_update ON public.reviews;
CREATE TRIGGER reviews_enforce_update
BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enforce_review_update();
