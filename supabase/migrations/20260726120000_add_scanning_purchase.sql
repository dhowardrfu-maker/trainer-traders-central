-- Tag scanning is a one-off paid add-on (£2.50) purchased from the profile
-- page. Once purchased it never expires and stays on for that seller.
ALTER TABLE public.profiles
  ADD COLUMN scanning_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN scanning_purchased_at timestamptz,
  ADD COLUMN scanning_payment_intent_id text;

-- Mirrors the trust model already used by create_order: the client reports
-- the Stripe payment_intent_id it received back from a successful
-- stripe.confirmPayment() call, we just record it — same pattern, not a
-- new one.
CREATE OR REPLACE FUNCTION public.activate_scanning(_stripe_payment_intent_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(coalesce(_stripe_payment_intent_id, '')) < 1 THEN
    RAISE EXCEPTION 'Invalid payment intent';
  END IF;

  UPDATE public.profiles
  SET scanning_enabled = true,
      scanning_purchased_at = now(),
      scanning_payment_intent_id = _stripe_payment_intent_id
  WHERE user_id = auth.uid();
END;
$$;
