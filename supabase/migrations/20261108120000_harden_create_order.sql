-- create_order is callable by any signed-in user over /rest/v1/rpc. It took
-- the Stripe payment intent id, postage and protection straight from the
-- caller and never required a payment at all, so an order (and later a
-- seller payout) could exist without anyone having paid.
--
-- Additions (everything else is unchanged from the live definition):
--   * a payment intent id is now mandatory and must look like a Stripe id
--   * postage must be within a sane range (carriers currently cost
--     GBP 2.56 - 7.99; bounds leave room for price changes)
--   * protection cannot be negative
--   * one payment intent can back at most one order (unique index)
--
-- The payout functions additionally verify the payment with Stripe before
-- any money leaves the platform; that is the check that cannot be faked
-- from the database side.

CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_payment_intent_id_key
  ON public.orders (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_order(
  _listing_id bigint,
  _carrier carrier,
  _service_label text,
  _postage_pence integer,
  _ship_to_name text,
  _ship_to_line1 text,
  _ship_to_line2 text,
  _ship_to_city text,
  _ship_to_postcode text,
  _offer_id uuid DEFAULT NULL::uuid,
  _stripe_payment_intent_id text DEFAULT NULL::text,
  _service_point_id text DEFAULT NULL::text,
  _ship_to_phone text DEFAULT NULL::text,
  _protection_pence integer DEFAULT 0
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  l_seller_id uuid;
  l_status public.listing_status;
  l_price integer;
  l_promotion_active boolean;
  l_promotion_percent smallint;
  l_shipping_protection_opted_in boolean;
  effective_price integer;
  shipping_protection_fee integer;
  new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _stripe_payment_intent_id IS NULL OR _stripe_payment_intent_id !~ '^pi_[A-Za-z0-9_]+$' THEN
    RAISE EXCEPTION 'Payment required';
  END IF;
  IF _postage_pence IS NULL OR _postage_pence < 250 OR _postage_pence > 2000 THEN
    RAISE EXCEPTION 'Invalid postage';
  END IF;
  IF _protection_pence IS NULL OR _protection_pence < 0 THEN
    RAISE EXCEPTION 'Invalid protection';
  END IF;

  IF length(coalesce(_ship_to_name, '')) < 2 OR length(_ship_to_name) > 100 THEN RAISE EXCEPTION 'Invalid ship_to_name'; END IF;
  IF length(coalesce(_ship_to_line1, '')) < 3 OR length(_ship_to_line1) > 120 THEN RAISE EXCEPTION 'Invalid ship_to_line1'; END IF;
  IF length(coalesce(_ship_to_city, '')) < 2 OR length(_ship_to_city) > 60 THEN RAISE EXCEPTION 'Invalid ship_to_city'; END IF;
  IF _ship_to_postcode !~* '^[A-Z0-9 ]{5,8}$' THEN RAISE EXCEPTION 'Invalid ship_to_postcode'; END IF;
  IF length(coalesce(_service_label, '')) < 1 OR length(_service_label) > 80 THEN RAISE EXCEPTION 'Invalid service_label'; END IF;

  SELECT seller_id, status, price_pence, promotion_active, promotion_percent, shipping_protection_opted_in
    INTO l_seller_id, l_status, l_price, l_promotion_active, l_promotion_percent, l_shipping_protection_opted_in
  FROM public.listings WHERE id = _listing_id;
  IF l_seller_id IS NULL THEN RAISE EXCEPTION 'Listing not found'; END IF;
  IF l_status <> 'active' THEN RAISE EXCEPTION 'Listing is not active'; END IF;
  IF l_seller_id = auth.uid() THEN RAISE EXCEPTION 'Cannot buy your own listing'; END IF;

  IF l_promotion_active AND l_promotion_percent IS NOT NULL THEN
    effective_price := round(l_price * (100 - l_promotion_percent) / 100.0);
  ELSE
    effective_price := l_price;
  END IF;

  -- An accepted offer overrides the promotion price
  IF _offer_id IS NOT NULL THEN
    SELECT amount_pence INTO effective_price
    FROM public.offers
    WHERE id = _offer_id
      AND listing_id = _listing_id
      AND buyer_id = auth.uid()
      AND status = 'accepted';
    IF effective_price IS NULL THEN RAISE EXCEPTION 'Invalid offer'; END IF;
  END IF;

  IF l_shipping_protection_opted_in AND effective_price > 2000 THEN
    IF effective_price <= 7500 THEN
      shipping_protection_fee := 300;
    ELSIF effective_price <= 15000 THEN
      shipping_protection_fee := 500;
    ELSE
      shipping_protection_fee := 750;
    END IF;
  ELSE
    shipping_protection_fee := 0;
  END IF;

  UPDATE public.listings SET status = 'sold' WHERE id = _listing_id;
  INSERT INTO public.orders (
    listing_id, buyer_id, seller_id,
    price_pence, postage_pence, protection_pence, total_pence,
    shipping_protection_fee_pence,
    carrier, service_label,
    ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode,
    tracking_code, status, stripe_payment_intent_id,
    service_point_id, ship_to_phone
  ) VALUES (
    _listing_id, auth.uid(), l_seller_id,
    effective_price, _postage_pence, _protection_pence, effective_price + _protection_pence + _postage_pence,
    shipping_protection_fee,
    _carrier, _service_label,
    _ship_to_name, _ship_to_line1, _ship_to_line2, _ship_to_city, upper(_ship_to_postcode),
    '', 'pending_postage', _stripe_payment_intent_id,
    _service_point_id, _ship_to_phone
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;
