-- Referral programme: every user's own username is their referral code
-- (prelovedkicks.co.uk/?ref=username). Reward is free tag-scanning access
-- for both the referrer and the referee, unlocked automatically the moment
-- the referee creates their first listing. No credit ledger needed -- the
-- existing scanning_enabled flag is already a one-time boolean unlock.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(user_id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_rewarded BOOLEAN NOT NULL DEFAULT false;

-- Called once, right after a new session starts, if a ?ref= code is
-- pending in localStorage. Self-referral and re-attribution are blocked;
-- silently no-ops rather than erroring so the frontend doesn't need to
-- special-case "invalid code" vs "already attributed".
CREATE OR REPLACE FUNCTION public.claim_referral(_ref_username text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_referrer_id uuid;
  l_current_referred_by uuid;
  l_own_username text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT referred_by, username INTO l_current_referred_by, l_own_username
  FROM public.profiles WHERE user_id = auth.uid();

  IF l_current_referred_by IS NOT NULL THEN
    RETURN;
  END IF;

  IF l_own_username IS NOT NULL AND lower(l_own_username) = lower(_ref_username) THEN
    RETURN;
  END IF;

  SELECT user_id INTO l_referrer_id FROM public.profiles WHERE lower(username) = lower(_ref_username);
  IF l_referrer_id IS NULL OR l_referrer_id = auth.uid() THEN
    RETURN;
  END IF;

  UPDATE public.profiles SET referred_by = l_referrer_id WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.claim_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_referral(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reward_referral_on_first_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  l_listing_count int;
  l_referred_by uuid;
  l_already_rewarded boolean;
BEGIN
  IF NEW.seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT referred_by, referral_rewarded INTO l_referred_by, l_already_rewarded
  FROM public.profiles WHERE user_id = NEW.seller_id;

  IF l_referred_by IS NULL OR l_already_rewarded THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO l_listing_count FROM public.listings WHERE seller_id = NEW.seller_id;
  IF l_listing_count <> 1 THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles SET scanning_enabled = true, referral_rewarded = true WHERE user_id = NEW.seller_id;
  UPDATE public.profiles SET scanning_enabled = true WHERE user_id = l_referred_by;

  INSERT INTO public.notifications (user_id, type, title, body, read)
  VALUES (
    NEW.seller_id, 'referral_reward', 'Free scanning unlocked!',
    'Thanks for joining through a friend''s invite -- tag scanning is now free on your account.', false
  );
  INSERT INTO public.notifications (user_id, type, title, body, read)
  VALUES (
    l_referred_by, 'referral_reward', 'Your referral just listed!',
    'Someone you invited made their first listing -- free tag scanning is now unlocked on your account too.', false
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reward_referral_on_first_listing ON public.listings;
CREATE TRIGGER trg_reward_referral_on_first_listing
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.reward_referral_on_first_listing();

REVOKE ALL ON FUNCTION public.reward_referral_on_first_listing() FROM PUBLIC, anon, authenticated;
