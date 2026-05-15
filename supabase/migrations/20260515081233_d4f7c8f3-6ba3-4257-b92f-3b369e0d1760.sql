CREATE OR REPLACE FUNCTION public.enforce_listing_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If a signed-in user is performing the update, lock view_count to its prior value.
  IF auth.uid() IS NOT NULL AND NEW.view_count IS DISTINCT FROM OLD.view_count THEN
    NEW.view_count := OLD.view_count;
  END IF;
  -- Sellers cannot reassign ownership.
  IF NEW.seller_id <> OLD.seller_id THEN
    RAISE EXCEPTION 'Cannot change listing owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS listings_enforce_update ON public.listings;
CREATE TRIGGER listings_enforce_update
BEFORE UPDATE ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_update();

CREATE OR REPLACE FUNCTION public.increment_listing_view(_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET view_count = view_count + 1
  WHERE id = _listing_id AND status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_listing_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO authenticated;