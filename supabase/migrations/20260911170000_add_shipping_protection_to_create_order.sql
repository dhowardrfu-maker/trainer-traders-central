-- Adds seller-funded shipping protection as an opt-in at checkout.
--
-- The buyer ticks a box on the checkout page saying they'd like this item
-- protected against loss/damage in transit. This does NOT change what the
-- buyer is charged -- total_pence is calculated exactly as before, with no
-- new amount added. The fee is instead computed here, server-side (never
-- trusted from the client), stored on the order, and later deducted from
-- the SELLER's payout in the same way postage already is. Nobody's Stripe
-- payment amount changes because of this fee, which is the whole point --
-- checkout's actual money-moving logic is untouched.
--
-- Fee tiers (only available on items over £20, matches the seller's own
-- chosen bands):
--   £20.01 - £75    -> £3.00
--   £75.01 - £150   -> £5.00
--   over £150       -> £7.50

DROP FUNCTION IF EXISTS public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text, integer
);

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
  _protection_pence integer DEFAULT 0,
  _want_shipping_protection boolean DEFAULT false
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
  effective_price integer;
  shipping_protection_fee integer;
  new_id uuid;
BEGIN
  IF length(coalesce(_ship_to_name, '')) < 2 OR length(_ship_to_name) > 100 THEN RAISE EXCEPTION 'Invalid ship_to_name'; END IF;
  IF length(coalesce(_ship_to_line1, '')) < 3 OR length(_ship_to_line1) > 120 THEN RAISE EXCEPTION 'Invalid ship_to_line1'; END IF;
  IF length(coalesce(_ship_to_city, '')) < 2 OR length(_ship_to_city) > 60 THEN RAISE EXCEPTION 'Invalid ship_to_city'; END IF;
  IF _ship_to_postcode !~* '^[A-Z0-9 ]{5,8}$' THEN RAISE EXCEPTION 'Invalid ship_to_postcode'; END IF;
  IF length(coalesce(_service_label, '')) < 1 OR length(_service_label) > 80 THEN RAISE EXCEPTION 'Invalid service_label'; END IF;

  SELECT seller_id, status, price_pence, promotion_active, promotion_percent
    INTO l_seller_id, l_status, l_price, l_promotion_active, l_promotion_percent
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

  IF _want_shipping_protection AND effective_price > 2000 THEN
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

REVOKE ALL ON FUNCTION public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text, integer, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text, integer, boolean
) TO authenticated;
