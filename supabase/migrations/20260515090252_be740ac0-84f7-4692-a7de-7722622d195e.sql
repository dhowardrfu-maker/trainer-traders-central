-- Revoke EXECUTE from PUBLIC/anon/authenticated on trigger-only and internal SECURITY DEFINER functions.
-- These are invoked by triggers or by other SECURITY DEFINER functions, never directly by clients.

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