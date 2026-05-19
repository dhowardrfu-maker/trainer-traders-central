-- 1) OFFERS: replace blanket UPDATE policy with column-level grants.
DROP POLICY IF EXISTS "Buyer or seller can update offers" ON public.offers;

CREATE POLICY "Buyer or seller can update offer status"
ON public.offers
FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id OR auth.uid() = seller_id)
WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);

REVOKE UPDATE ON public.offers FROM anon, authenticated, PUBLIC;
GRANT UPDATE (status, updated_at) ON public.offers TO authenticated;

-- 2) REALTIME: scope channel subscriptions to the requesting user.
DROP POLICY IF EXISTS "Authenticated postgres_changes only" ON realtime.messages;

CREATE POLICY "Scoped realtime subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  extension = 'postgres_changes'
  OR (
    extension IN ('broadcast', 'presence')
    AND topic = 'notifications:' || auth.uid()::text
  )
  OR (
    extension IN ('broadcast', 'presence')
    AND topic LIKE 'thread:%'
    AND public.is_thread_participant(
      NULLIF(split_part(topic, ':', 2), '')::uuid,
      auth.uid()
    )
  )
);