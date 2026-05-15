
-- Revoke broad EXECUTE grants from anon and PUBLIC on all SECURITY DEFINER functions,
-- then re-grant to `authenticated` only for functions intended to be called from the app.

-- Trigger functions and internal helpers: no direct EXECUTE needed
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bump_thread_last_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_listing_sold() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_offer_new() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_offer_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_review_new() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_message_new() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_role_escalation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_offer_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_listing_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_review_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Helpers used inside RLS policies (called by the policy executor, not directly).
-- Revoke from anon/PUBLIC; keep authenticated so RLS policies still resolve.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.is_thread_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid, uuid) TO authenticated;

-- App-callable RPCs: signed-in users only
REVOKE ALL ON FUNCTION public.get_my_sales() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_sales() TO authenticated;

REVOKE ALL ON FUNCTION public.create_order(uuid, public.carrier, text, integer, text, text, text, text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_order(uuid, public.carrier, text, integer, text, text, text, text, text, text, text, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.increment_listing_view(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_listing_view(uuid) TO authenticated;
