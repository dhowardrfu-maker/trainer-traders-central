-- Security hardening found in the Nov 2026 review.
--
-- 1. Trigger-only SECURITY DEFINER functions were callable over /rest/v1/rpc
--    by anon and signed-in users. Triggers do not need the caller to hold
--    EXECUTE, so revoke it. insert_notification is not called from anywhere
--    (the app inserts into notifications directly) but would have let anyone
--    create a notification for any user, so it is revoked too.
-- 2. Pin search_path on those functions.
-- 3. The notifications INSERT policy was `WITH CHECK (true)` for everyone,
--    including signed-out visitors. The app legitimately inserts
--    notifications for *other* users from the browser (offers, shipping,
--    disputes), so the policy cannot be closed completely without moving
--    that to the server. Narrow it instead: signed-in only, cannot forge
--    admin "campaign" messages, and links must be relative to the site.
--
-- is_profile_admin / has_role / is_thread_participant are deliberately left
-- executable: RLS policies call them as the querying user.

REVOKE EXECUTE ON FUNCTION public.bump_thread_last_message()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_listing_rate_limit()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_message_rate_limit()    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_offer_rate_limit()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()             FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_listing_sold()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_thread_last_message()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.insert_notification(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.bump_thread_last_message()   SET search_path = public;
ALTER FUNCTION public.check_listing_rate_limit()   SET search_path = public;
ALTER FUNCTION public.check_message_rate_limit()   SET search_path = public;
ALTER FUNCTION public.check_offer_rate_limit()     SET search_path = public;
ALTER FUNCTION public.update_thread_last_message() SET search_path = public;
ALTER FUNCTION public.insert_notification(uuid, text, text, text, text) SET search_path = public;

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

CREATE POLICY "Signed-in users can create notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type <> 'campaign'
    AND (link IS NULL OR (link LIKE '/%' AND link NOT LIKE '//%'))
  );
