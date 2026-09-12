-- request_order_cancellation correctly requires status IN
-- ('pending_postage', 'label_created'), but agree_order_cancellation (the
-- other party accepting that request) never re-checked the order hadn't
-- since moved on -- e.g. the seller shipping the item after a
-- cancellation was requested, then agreeing to it anyway. That would
-- flip the order to 'cancelled' with cancellation_agreed = true, one of
-- the two states create-refund's guard accepts, while the item is
-- already on its way to the buyer.
CREATE OR REPLACE FUNCTION public.agree_order_cancellation(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_buyer_id uuid;
  l_seller_id uuid;
  l_requested_by uuid;
  l_agreed boolean;
  l_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT buyer_id, seller_id, cancellation_requested_by, cancellation_agreed, status
  INTO l_buyer_id, l_seller_id, l_requested_by, l_agreed, l_status
  FROM public.orders WHERE id = _order_id;
  IF l_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF auth.uid() NOT IN (l_buyer_id, l_seller_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_requested_by IS NULL OR l_agreed IS TRUE THEN
    RAISE EXCEPTION 'No pending cancellation request';
  END IF;
  IF l_requested_by = auth.uid() THEN
    RAISE EXCEPTION 'The requesting party cannot agree to their own request';
  END IF;
  IF l_status NOT IN ('pending_postage', 'label_created') THEN
    RAISE EXCEPTION 'This order has moved on and can no longer be cancelled';
  END IF;

  UPDATE public.orders
  SET cancellation_agreed = true,
      status = 'cancelled',
      updated_at = now()
  WHERE id = _order_id;
END;
$$;
