CREATE OR REPLACE FUNCTION public.create_order(
  _listing_id uuid,
  _carrier public.carrier,
  _service_label text,
  _postage_pence integer,
  _ship_to_name text,
  _ship_to_line1 text,
  _ship_to_line2 text,
  _ship_to_city text,
  _ship_to_postcode text,
  _offer_id uuid DEFAULT NULL
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
  effective_price integer;
  v_tracking text;
  v_qr text;
  new_id uuid;
  alphabet CONSTANT text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  body text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _carrier <> 'royal_mail' THEN
    RAISE EXCEPTION 'Only Royal Mail is supported';
  END IF;
  IF _postage_pence IS NULL OR _postage_pence < 0 OR _postage_pence > 5000 THEN
    RAISE EXCEPTION 'Invalid postage';
  END IF;

  IF length(coalesce(_ship_to_name, ''))     < 2  OR length(_ship_to_name)     > 100 THEN RAISE EXCEPTION 'Invalid ship_to_name';     END IF;
  IF length(coalesce(_ship_to_line1, ''))    < 3  OR length(_ship_to_line1)    > 120 THEN RAISE EXCEPTION 'Invalid ship_to_line1';    END IF;
  IF _ship_to_line2 IS NOT NULL AND length(_ship_to_line2) > 120 THEN RAISE EXCEPTION 'Invalid ship_to_line2'; END IF;
  IF length(coalesce(_ship_to_city, ''))     < 2  OR length(_ship_to_city)     > 60  THEN RAISE EXCEPTION 'Invalid ship_to_city';     END IF;
  IF _ship_to_postcode !~* '^[A-Z0-9 ]{5,8}$' THEN RAISE EXCEPTION 'Invalid ship_to_postcode'; END IF;
  IF length(coalesce(_service_label, ''))    < 1  OR length(_service_label)    > 80  THEN RAISE EXCEPTION 'Invalid service_label';   END IF;

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

  body := '';
  FOR i IN 1..2 LOOP
    body := body || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  v_tracking := 'RM' || body || lpad(floor(random() * 900000000 + 100000000)::bigint::text, 9, '0') || 'GB';

  v_qr := jsonb_build_object(
    'v', 1,
    'brand', 'PrelovedKicks',
    'order_pending', true,
    'carrier', 'royal_mail',
    'service', _service_label,
    'tracking', v_tracking,
    'ship_to', jsonb_build_object(
      'name', _ship_to_name,
      'postcode', upper(_ship_to_postcode)
    ),
    'ts', extract(epoch from now())::bigint
  )::text;

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
    _ship_to_name, _ship_to_line1, _ship_to_line2, _ship_to_city, upper(_ship_to_postcode),
    v_tracking, v_qr, 'label_created'
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;