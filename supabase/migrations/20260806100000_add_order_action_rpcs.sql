-- RLS on orders has no INSERT/UPDATE policy at all (by design, per the
-- 20260515084344 migration that removed buyer/seller self-update and moved
-- postage/status updates behind update_order_status()). But cancellation,
-- dispute, receipt-confirmation, and admin actions still call
-- `.from("orders").update(...)` directly from the browser client — those
-- silently no-op (RLS blocks the write, Supabase returns success with 0
-- rows changed, no error is raised). Confirmed this leaves the UI showing
-- "success" while nothing actually happened. This migration adds a
-- SECURITY DEFINER RPC per action, each checking exactly who's allowed to
-- do it, mirroring the existing update_order_status() pattern.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_description TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_images TEXT[];
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispute_raised_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_requested_by UUID;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_agreed BOOLEAN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_sent BOOLEAN;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS evri_delivered_at TIMESTAMPTZ;

-- Buyer or seller requests to cancel (OrderConfirmation.tsx handleRequestCancel).
CREATE OR REPLACE FUNCTION public.request_order_cancellation(_order_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_buyer_id uuid;
  l_seller_id uuid;
  l_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT buyer_id, seller_id, status INTO l_buyer_id, l_seller_id, l_status
  FROM public.orders WHERE id = _order_id;
  IF l_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF auth.uid() NOT IN (l_buyer_id, l_seller_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_status NOT IN ('pending_postage', 'label_created') THEN
    RAISE EXCEPTION 'Order can no longer be cancelled';
  END IF;

  UPDATE public.orders
  SET cancellation_requested_by = auth.uid(),
      cancellation_reason = _reason,
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- The OTHER party agrees to the pending cancellation (handleAgreeCancel).
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT buyer_id, seller_id, cancellation_requested_by, cancellation_agreed
  INTO l_buyer_id, l_seller_id, l_requested_by, l_agreed
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

  UPDATE public.orders
  SET cancellation_agreed = true,
      status = 'cancelled',
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- Buyer raises a dispute on a shipped order (handleRaiseDispute).
CREATE OR REPLACE FUNCTION public.raise_order_dispute(
  _order_id uuid,
  _description text,
  _images text[] DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_buyer_id uuid;
  l_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT buyer_id, status INTO l_buyer_id, l_status
  FROM public.orders WHERE id = _order_id;
  IF l_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_status <> 'shipped' THEN
    RAISE EXCEPTION 'Dispute can only be raised on a shipped order';
  END IF;

  UPDATE public.orders
  SET dispute_raised_at = now(),
      dispute_description = _description,
      dispute_images = _images,
      dispute_status = 'open',
      status = 'disputed',
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- Buyer confirms receipt (handleConfirmReceipt).
CREATE OR REPLACE FUNCTION public.confirm_order_receipt(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_buyer_id uuid;
  l_status public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT buyer_id, status INTO l_buyer_id, l_status
  FROM public.orders WHERE id = _order_id;
  IF l_buyer_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_buyer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_status <> 'shipped' THEN
    RAISE EXCEPTION 'Order is not awaiting receipt confirmation';
  END IF;

  UPDATE public.orders
  SET status = 'delivered',
      evri_delivered_at = now(),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- Seller resolves an open dispute by refunding the buyer (handleSellerRefund).
-- Only flips the DB flags; the actual Stripe refund is still triggered
-- separately via the create-refund edge function, same as before.
CREATE OR REPLACE FUNCTION public.seller_refund_dispute(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_seller_id uuid;
  l_dispute_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT seller_id, dispute_status INTO l_seller_id, l_dispute_status
  FROM public.orders WHERE id = _order_id;
  IF l_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_dispute_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'No open dispute on this order';
  END IF;

  UPDATE public.orders
  SET dispute_status = 'refunded',
      status = 'cancelled',
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- Seller requests a return instead of refunding outright (handleSellerRequestReturn).
CREATE OR REPLACE FUNCTION public.seller_request_return(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_seller_id uuid;
  l_dispute_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT seller_id, dispute_status INTO l_seller_id, l_dispute_status
  FROM public.orders WHERE id = _order_id;
  IF l_seller_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF l_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF l_dispute_status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'No open dispute on this order';
  END IF;

  UPDATE public.orders
  SET dispute_status = 'return_requested',
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

-- Admin actions (Admin.tsx: refund, approve cancellation, resolve dispute).
-- One flexible RPC instead of four narrow ones; only non-null args are applied.
CREATE OR REPLACE FUNCTION public.admin_update_order(
  _order_id uuid,
  _status public.order_status DEFAULT NULL,
  _dispute_status text DEFAULT NULL,
  _cancellation_agreed boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_profile_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.orders
  SET status = COALESCE(_status, status),
      dispute_status = COALESCE(_dispute_status, dispute_status),
      cancellation_agreed = COALESCE(_cancellation_agreed, cancellation_agreed),
      updated_at = now()
  WHERE id = _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_order_cancellation(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.agree_order_cancellation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.raise_order_dispute(uuid, text, text[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_order_receipt(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.seller_refund_dispute(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.seller_request_return(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_order(uuid, public.order_status, text, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.request_order_cancellation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agree_order_cancellation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.raise_order_dispute(uuid, text, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_order_receipt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_refund_dispute(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.seller_request_return(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_order(uuid, public.order_status, text, boolean) TO authenticated;
