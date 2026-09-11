-- Two real, pre-existing bugs found while investigating a buyer-protection
-- rate change:
--
-- 1. orders.total_pence has only ever been (price + postage) -- the
--    protection fee charged via Stripe was never actually stored on the
--    order, only reverse-derived later from a hardcoded rate assumption
--    (auto-payout, create-payout, OrderConfirmation.tsx all did
--    `(total_pence - postage) / 1.04 * 0.04`, which doesn't correctly
--    recover the real amount from a total that never included it, and
--    would break entirely the moment the rate changes). Fixed by storing
--    protection_pence directly on the order at creation time.
--
-- 2. There are TWO overloaded versions of create_order live. The one the
--    frontend actually calls (13 params, with service_point_id/
--    ship_to_phone for InPost) never picked up the promotion logic that
--    was added to the other, now-unused 11-param overload -- meaning any
--    listing with an active promotion has been charging buyers full price.
--    Fixed by consolidating to one function with both promotion handling
--    and the InPost params, and dropping the stale duplicate.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS protection_pence integer NOT NULL DEFAULT 0;

-- Adding a new parameter changes the function's type signature, so
-- CREATE OR REPLACE below would NOT replace either existing overload in
-- place -- it would add a third one alongside them. Drop both old
-- signatures explicitly so there's exactly one create_order afterwards,
-- rather than repeating the exact "two silently-diverged overloads"
-- problem this migration exists to fix.
DROP FUNCTION IF EXISTS public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text
);
DROP FUNCTION IF EXISTS public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text
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
  effective_price integer;
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

  UPDATE public.listings SET status = 'sold' WHERE id = _listing_id;
  INSERT INTO public.orders (
    listing_id, buyer_id, seller_id,
    price_pence, postage_pence, protection_pence, total_pence,
    carrier, service_label,
    ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode,
    tracking_code, status, stripe_payment_intent_id,
    service_point_id, ship_to_phone
  ) VALUES (
    _listing_id, auth.uid(), l_seller_id,
    effective_price, _postage_pence, _protection_pence, effective_price + _protection_pence + _postage_pence,
    _carrier, _service_label,
    _ship_to_name, _ship_to_line1, _ship_to_line2, _ship_to_city, upper(_ship_to_postcode),
    '', 'pending_postage', _stripe_payment_intent_id,
    _service_point_id, _ship_to_phone
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$function$;

-- Dropping and recreating with a new signature clears any existing grants
-- on the old versions, so this must be re-applied explicitly or checkout
-- breaks entirely (anon/authenticated would get "permission denied").
REVOKE ALL ON FUNCTION public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text, integer
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(
  bigint, carrier, text, integer, text, text, text, text, text, uuid, text, text, text, integer
) TO authenticated;
