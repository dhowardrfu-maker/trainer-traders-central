-- update_order_status let the seller set an order to ANY status at all,
-- with zero validation of the transition -- e.g. jumping straight from
-- pending_postage to delivered, no shipping ever required. It's also
-- never actually been called from the app (confirmed via grep across
-- src/), which combined with the orders RLS gap fixed in the previous
-- migration explains a bigger problem: nothing anywhere has ever moved a
-- real order to 'shipped'. confirm_order_receipt (which is the only place
-- evri_delivered_at ever gets set) requires status = 'shipped' to run, and
-- auto-payout requires evri_delivered_at IS NOT NULL -- so the intended
-- automatic payout path has likely never been reachable at all, only
-- through the raw-update loophole just closed.
--
-- Fixes update_order_status to only allow the one legitimate transition it
-- should ever be used for (seller marking their own order shipped, once a
-- label exists or otherwise), and wires this up as the missing step.
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
  l_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT seller_id, status INTO l_seller_id, l_status FROM public.orders WHERE id = _order_id;
  IF l_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- The only transition this RPC is for: seller marking an order shipped,
  -- from either pending_postage (shipped without ever generating a label
  -- through the app) or label_created (the normal path). Every other
  -- status change already has its own dedicated, correctly-scoped RPC
  -- (agree_order_cancellation, confirm_order_receipt, raise_order_dispute,
  -- seller_refund_dispute, admin_update_order) -- this one should never be
  -- a general-purpose status setter.
  IF _status <> 'shipped' THEN
    RAISE EXCEPTION 'This action can only mark an order as shipped';
  END IF;
  IF l_status NOT IN ('pending_postage', 'label_created') THEN
    RAISE EXCEPTION 'Order cannot be marked shipped from its current status';
  END IF;

  UPDATE public.orders
  SET status = _status,
      tracking_code = COALESCE(_tracking_code, tracking_code),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_order_status(uuid, public.order_status, text) TO authenticated;

-- create-payout (the manual, buyer-or-seller-triggered path) only checked
-- status = 'delivered', never evri_delivered_at -- unlike auto-payout,
-- which correctly requires both. Since status alone can now only ever
-- reach 'delivered' through confirm_order_receipt (which sets both
-- together), requiring evri_delivered_at here too closes the gap without
-- changing behaviour for any order that went through the real flow.
