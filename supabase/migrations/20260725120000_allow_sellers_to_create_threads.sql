-- Sellers can now message buyers from the account Offers tab, but thread
-- creation was restricted to buyer-initiated chats only ("Buyers can create
-- threads" required auth.uid() = buyer_id). Broaden the insert check to
-- either participant, matching the existing "Thread participants can view
-- threads" select policy.

DROP POLICY IF EXISTS "Buyers can create threads" ON public.threads;

CREATE POLICY "Thread participants can create threads"
ON public.threads
FOR INSERT
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
