-- The original "Profiles are viewable by everyone" policy (USING (true)) exposed the
-- entire profiles row -- including address_line1/2, city, postcode, phone, full_name,
-- and stripe_connect_id -- to any unauthenticated request using only the public anon key.
-- Confirmed live and exploitable on 2026-08-06.
--
-- These columns were added to the live table outside of any tracked migration (schema
-- drift), so this migration also records them here with IF NOT EXISTS so the migration
-- history matches what's actually deployed.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_connect_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Users can read their own full row (address, phone, stripe fields included).
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Admin check mirrors the existing has_role() pattern (security definer avoids RLS
-- recursion on the same table). Admin.tsx already gates on profiles.is_admin, so the
-- policy checks that column rather than the separate user_roles/has_role() system.
CREATE OR REPLACE FUNCTION public.is_profile_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE user_id = _user_id), false)
$$;

REVOKE ALL ON FUNCTION public.is_profile_admin(UUID) FROM PUBLIC, anon, authenticated;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_profile_admin(auth.uid()));

-- Public-safe view: only the columns other users are ever meant to see
-- (seller name on a listing, reviewer name, trainer-of-the-week, etc).
-- Deliberately NOT security_invoker: this view is owned by the migration role
-- (which bypasses RLS on the base table), so anon/authenticated can read the
-- safe columns below without needing a row-level policy that would otherwise
-- expose the whole row again.
CREATE OR REPLACE VIEW public.profiles_public AS
SELECT user_id, username, display_name, avatar_url, bio, location, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
