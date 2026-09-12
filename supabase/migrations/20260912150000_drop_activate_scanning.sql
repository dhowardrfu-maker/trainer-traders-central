-- activate_scanning accepted any non-empty string as a "payment intent
-- id" and never verified anything with Stripe -- any signed-in user
-- could call it directly from the browser console and unlock scanning
-- for free. Replaced by the confirm-scan-payment edge function, which
-- actually retrieves the PaymentIntent from Stripe and checks it
-- succeeded, for the right amount, for this exact account, before
-- touching the database. No longer called from anywhere in the app.
DROP FUNCTION IF EXISTS public.activate_scanning(text);
