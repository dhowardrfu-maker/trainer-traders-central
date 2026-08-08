-- Switch referral codes from username to user_id. username turned out to
-- be null on at least one real, active seller account despite the signup
-- trigger's fallback logic -- rather than chase down why, use the one
-- identifier that's guaranteed to exist for every account: user_id.
DROP FUNCTION IF EXISTS public.claim_referral(text);

CREATE OR REPLACE FUNCTION public.claim_referral(_ref_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_current_referred_by uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _ref_user_id = auth.uid() THEN
    RETURN;
  END IF;

  SELECT referred_by INTO l_current_referred_by
  FROM public.profiles WHERE user_id = auth.uid();

  IF l_current_referred_by IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _ref_user_id) THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET referred_by = _ref_user_id WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(uuid) TO authenticated;
