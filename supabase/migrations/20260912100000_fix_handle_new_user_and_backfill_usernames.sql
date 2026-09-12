-- Schema drift: the tracked handle_new_user (20260426175922) generates a
-- username/display_name on signup, but the LIVE function (confirmed via
-- pg_get_functiondef) had been replaced at some point outside of any
-- migration with a minimal version that only inserts user_id. This is why
-- username has been null for every account since the very first signup,
-- not a new regression -- a prior migration (20260806130000) even noted
-- "username turned out to be null on at least one real, active seller
-- account" and worked around it for referrals without finding the cause.
--
-- This restores the real trigger for every future signup, then backfills
-- every existing account so nobody's listing shows the bare "seller"
-- fallback. display_name is only touched where it's currently null --
-- anyone who already set their own is left exactly as they are.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  candidate TEXT;
  suffix INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'preferred_username',
    split_part(NEW.email, '@', 1),
    'user'
  );
  base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user';
  END IF;

  candidate := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) LOOP
    suffix := suffix + 1;
    candidate := base_username || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    candidate,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      candidate
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill every existing profile missing a username (which, per the
-- diagnostic query, is currently all of them).
DO $$
DECLARE
  r RECORD;
  base_username TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR r IN
    SELECT p.user_id, p.display_name, u.email, u.raw_user_meta_data
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE p.username IS NULL
  LOOP
    base_username := COALESCE(
      r.raw_user_meta_data ->> 'username',
      r.raw_user_meta_data ->> 'preferred_username',
      split_part(r.email, '@', 1),
      'user'
    );
    base_username := lower(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'));
    IF base_username = '' OR base_username IS NULL THEN
      base_username := 'user';
    END IF;

    candidate := base_username;
    suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate AND user_id <> r.user_id) LOOP
      suffix := suffix + 1;
      candidate := base_username || suffix::text;
    END LOOP;

    UPDATE public.profiles
    SET username = candidate,
        display_name = COALESCE(
          display_name,
          r.raw_user_meta_data ->> 'full_name',
          r.raw_user_meta_data ->> 'name',
          candidate
        )
    WHERE user_id = r.user_id;
  END LOOP;
END $$;
