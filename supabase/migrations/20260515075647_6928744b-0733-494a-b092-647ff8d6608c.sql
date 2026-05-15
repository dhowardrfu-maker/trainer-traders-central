
-- 1. Orders: server-side price-validated order creation
CREATE OR REPLACE FUNCTION public.create_order(
  _listing_id uuid,
  _carrier carrier,
  _service_label text,
  _postage_pence integer,
  _ship_to_name text,
  _ship_to_line1 text,
  _ship_to_line2 text,
  _ship_to_city text,
  _ship_to_postcode text,
  _tracking_code text,
  _qr_payload text,
  _offer_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l_seller_id uuid;
  l_status listing_status;
  l_price integer;
  effective_price integer;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _postage_pence IS NULL OR _postage_pence < 0 OR _postage_pence > 5000 THEN
    RAISE EXCEPTION 'Invalid postage';
  END IF;

  SELECT seller_id, status, price_pence
    INTO l_seller_id, l_status, l_price
  FROM public.listings WHERE id = _listing_id;

  IF l_seller_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF l_status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF l_seller_id = auth.uid() THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;

  effective_price := l_price;

  IF _offer_id IS NOT NULL THEN
    SELECT amount_pence INTO effective_price
    FROM public.offers
    WHERE id = _offer_id
      AND listing_id = _listing_id
      AND buyer_id = auth.uid()
      AND status = 'accepted';
    IF effective_price IS NULL THEN
      RAISE EXCEPTION 'Offer not valid';
    END IF;
  END IF;

  INSERT INTO public.orders (
    listing_id, buyer_id, seller_id,
    price_pence, postage_pence, total_pence,
    carrier, service_label,
    ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode,
    tracking_code, qr_payload, status
  ) VALUES (
    _listing_id, auth.uid(), l_seller_id,
    effective_price, _postage_pence, effective_price + _postage_pence,
    _carrier, _service_label,
    _ship_to_name, _ship_to_line1, _ship_to_line2, _ship_to_city, _ship_to_postcode,
    _tracking_code, _qr_payload, 'label_created'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order(uuid, carrier, text, integer, text, text, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, carrier, text, integer, text, text, text, text, text, text, text, uuid) TO authenticated;

-- Block direct buyer-side INSERT to orders so the RPC is the only path
DROP POLICY IF EXISTS "Buyers can create their own orders" ON public.orders;

-- 2. Offers: enforce immutability rules via trigger
CREATE OR REPLACE FUNCTION public.enforce_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Once finalised, no further changes
  IF OLD.status IN ('accepted','rejected','expired','withdrawn')
     AND (NEW.status <> OLD.status OR NEW.amount_pence <> OLD.amount_pence) THEN
    RAISE EXCEPTION 'Offer is finalised';
  END IF;

  -- Amount is always immutable
  IF NEW.amount_pence <> OLD.amount_pence THEN
    RAISE EXCEPTION 'Offer amount cannot be changed';
  END IF;

  -- Identity fields immutable
  IF NEW.buyer_id <> OLD.buyer_id OR NEW.seller_id <> OLD.seller_id OR NEW.listing_id <> OLD.listing_id THEN
    RAISE EXCEPTION 'Offer parties cannot be changed';
  END IF;

  -- Buyers cannot self-accept/reject/counter; only withdraw
  IF auth.uid() = OLD.buyer_id AND auth.uid() <> OLD.seller_id THEN
    IF NEW.status NOT IN (OLD.status, 'withdrawn') THEN
      RAISE EXCEPTION 'Buyers can only withdraw their offer';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_enforce_update ON public.offers;
CREATE TRIGGER offers_enforce_update
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.enforce_offer_update();

-- 3. Realtime: tighten subscription policy
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON realtime.messages;
CREATE POLICY "Authenticated postgres_changes only"
ON realtime.messages
FOR SELECT TO authenticated
USING (extension = 'postgres_changes');

-- Remove overly broad messages SELECT (is_thread_participant policy still applies)
DROP POLICY IF EXISTS "Authenticated can subscribe to realtime" ON public.messages;

-- 4. Lock down SECURITY DEFINER function execution to authenticated only
REVOKE EXECUTE ON FUNCTION public.get_my_sales() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_sales() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) TO authenticated;
