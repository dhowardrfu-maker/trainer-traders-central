-- CRITICAL: the tracked "Users can update their own profile" policy only
-- checks auth.uid() = user_id, with no column restriction -- confirmed
-- live via `select policyname, cmd, qual from pg_policies where
-- tablename='profiles' and cmd='UPDATE'` returning exactly that policy,
-- unchanged. Any authenticated user could run:
--   supabase.from('profiles').update({ is_admin: true }).eq('user_id', myId)
-- and grant themselves full admin access (is_profile_admin() reads this
-- column directly, gating the Admin panel and admin_update_order()), or
-- similarly fake stripe_connect_enabled without ever completing Stripe's
-- KYC. The `offers` table had this exact class of bug and was already
-- fixed the right way (20260519211726) with column-level GRANTs; this
-- applies the same pattern here.
--
-- listings has the same shape of problem: sellers can update their own
-- listing (by design), but with no column restriction they could set
-- sold_via_order = true directly to fake a verified platform sale.

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.profiles FROM anon, authenticated, PUBLIC;
GRANT UPDATE (
  display_name, username, bio, location, avatar_url, full_name,
  address_line1, address_line2, city, postcode, phone,
  has_chosen_display_name
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "Sellers can update their own listings" ON public.listings;
CREATE POLICY "Sellers can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

REVOKE UPDATE ON public.listings FROM anon, authenticated, PUBLIC;
GRANT UPDATE (
  title, brand, model, size_uk, size_eu, condition, gender, color,
  description, price_pence, retail_price_pence, postage_pence,
  size_category, photos, status, promotion_active, promotion_percent,
  shipping_protection_opted_in
) ON public.listings TO authenticated;
