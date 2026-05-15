-- Make the no-direct-seller-SELECT and no-DELETE intents explicit via RESTRICTIVE policies.

-- Orders: only the buyer may SELECT directly. Sellers must use get_my_sales() RPC
-- (which returns safe columns only — no qr_payload, no full address).
CREATE POLICY "Only buyers may directly select orders"
ON public.orders
AS RESTRICTIVE
FOR SELECT
TO authenticated, anon
USING (auth.uid() = buyer_id);

-- Offers: explicitly block all DELETEs. Withdrawal is a status UPDATE to 'withdrawn'
-- so the audit trail and enforce_offer_update trigger protections always apply.
CREATE POLICY "Offers cannot be deleted"
ON public.offers
AS RESTRICTIVE
FOR DELETE
TO authenticated, anon
USING (false);