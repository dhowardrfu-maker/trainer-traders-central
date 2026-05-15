
-- 1. Orders: remove buyer UPDATE policy (buyers shouldn't tamper with order fields)
DROP POLICY IF EXISTS "Buyers can update their orders" ON public.orders;

-- 2. user_roles: prevent privilege escalation via trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow inserts via SECURITY DEFINER context (no JWT) or by existing admins
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized to assign roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON public.user_roles;
CREATE TRIGGER prevent_role_escalation_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- Explicit deny INSERT/UPDATE/DELETE policies (defense-in-depth — admins can manage via service role)
CREATE POLICY "Only admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Realtime channel authorization — restrict broadcast/presence
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all realtime broadcast by default" ON realtime.messages;
CREATE POLICY "Deny all realtime broadcast by default" ON realtime.messages
FOR ALL TO authenticated, anon
USING (false)
WITH CHECK (false);

-- 4. Storage: replace broad SELECT on listing-photos with deny-listing
DROP POLICY IF EXISTS "Listing photos are publicly viewable" ON storage.objects;

-- Keep public read access for direct URL fetches (object-level), but require knowing the path.
-- Public buckets allow direct GET via the public URL regardless of RLS, so no SELECT policy is needed
-- for that path. We add a narrow SELECT for owners so they can list their own files.
CREATE POLICY "Owners can list their own listing photos" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 5. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated.
-- RLS policies still call them because they run in the table owner's context.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.bump_thread_last_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.mark_listing_sold() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_offer_new() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_offer_status() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_review_new() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_message_new() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_role_escalation() FROM anon, authenticated, public;
