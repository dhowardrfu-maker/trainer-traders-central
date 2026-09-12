-- CRITICAL: live orders RLS still had "Buyers can update their own orders"
-- and "Sellers can update their own sales" -- UPDATE policies scoped only
-- by auth.uid() = buyer_id / seller_id, no column restriction whatsoever.
-- Confirmed live via `select policyname, cmd, qual from pg_policies where
-- tablename='orders'`. The tracked migration history clearly shows these
-- being intentionally replaced months ago by narrow SECURITY DEFINER RPCs
-- (request_order_cancellation, agree_order_cancellation, raise_order_dispute,
-- confirm_order_receipt, update_order_status, admin_update_order) -- but
-- that replacement never actually reached the live database. This also
-- explains why orders ever transition to 'label_created'/'shipped' at all:
-- create-shipping-label's own client-side update has been relying on this
-- exact loophole rather than going through any RPC.
--
-- With this policy live, a buyer or seller could set ANY column on their
-- own order directly -- including cancellation_agreed (bypassing the
-- two-party requirement in agree_order_cancellation, and therefore
-- bypassing create-refund's guard added earlier today), status='delivered'
-- (bypassing confirm_order_receipt and triggering a payout with nothing
-- ever shipped), or the price/fee columns that decide their own payout.
--
-- No legitimate client-side code anywhere writes to orders directly
-- (confirmed by grep -- every src/ reference to the orders table is a
-- .select(), never .update()), so no column needs to stay writable here at
-- all; every real mutation already goes through a SECURITY DEFINER
-- function, which bypasses RLS entirely as the table owner regardless of
-- these grants (already relied on by create_order, which writes to both
-- listings and orders despite both tables being locked down).

DROP POLICY IF EXISTS "Buyers can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers can update their own sales" ON public.orders;
DROP POLICY IF EXISTS "Admins can update any order" ON public.orders;

REVOKE UPDATE ON public.orders FROM anon, authenticated, PUBLIC;
