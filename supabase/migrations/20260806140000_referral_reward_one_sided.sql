-- Reward is one-sided: only the referrer gets free scanning when their
-- referral lists their first item. The referee still has to either pay
-- the usual £2.50 or refer someone themselves to unlock it -- no free
-- ride just for signing up via a link.
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

  -- Referrer gets the reward. Referee only gets referral_rewarded flipped
  -- so this can't fire again on a later listing -- their own
  -- scanning_enabled is untouched.
  UPDATE public.profiles SET referral_rewarded = true WHERE user_id = NEW.seller_id;
  UPDATE public.profiles SET scanning_enabled = true WHERE user_id = l_referred_by;

  INSERT INTO public.notifications (user_id, type, title, body, read)
  VALUES (
    l_referred_by, 'referral_reward', 'Your referral just listed!',
    'Someone you invited made their first listing -- free tag scanning is now unlocked on your account.', false
  );

  RETURN NEW;
END;
$$;
