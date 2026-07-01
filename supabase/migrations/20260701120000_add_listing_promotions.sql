-- ============ LISTING PROMOTIONS ============
ALTER TABLE public.listings
  ADD COLUMN promotion_active boolean NOT NULL DEFAULT false,
  ADD COLUMN promotion_percent smallint;

-- promotion_percent must be set (1-90) when active, and null when inactive
ALTER TABLE public.listings
  ADD CONSTRAINT listings_promotion_percent_check
  CHECK (
    (promotion_active = false AND promotion_percent IS NULL)
    OR (promotion_active = true AND promotion_percent BETWEEN 1 AND 90)
  );

-- Recreate create_order so it applies an active promotion when computing
-- the price actually charged (an accepted offer still takes precedence).
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
  _offer_id uuid DEFAULT NULL,
  _stripe_payment_intent_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    price_pence, postage_pence, total_pence,
    carrier, service_label,
    ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode,
    tracking_code, status, stripe_payment_intent_id
  ) VALUES (
    _listing_id, auth.uid(), l_seller_id,
    effective_price, _postage_pence, effective_price + _postage_pence,
    _carrier, _service_label,
    _ship_to_name, _ship_to_line1, _ship_to_line2, _ship_to_city, upper(_ship_to_postcode),
    '', 'pending_postage', _stripe_payment_intent_id
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;