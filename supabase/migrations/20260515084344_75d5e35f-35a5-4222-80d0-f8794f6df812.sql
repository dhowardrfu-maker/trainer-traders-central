-- Remove the over-broad seller UPDATE policy on orders.
DROP POLICY IF EXISTS "Sellers can update their orders" ON public.orders;

-- Safe RPC: sellers may only update status + tracking_code on their own orders.
CREATE OR REPLACE FUNCTION public.update_order_status(
  _order_id uuid,
  _status public.order_status,
  _tracking_code text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_seller_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT seller_id INTO l_seller_id FROM public.orders WHERE id = _order_id;
  IF l_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.orders
  SET status = _status,
      tracking_code = COALESCE(_tracking_code, tracking_code),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status, text) TO authenticated;