-- The hourly auto-payout cron job has never run successfully:
--   1. pg_net was not installed, so net.http_post() did not exist
--      ("schema \"net\" does not exist" on every run).
--   2. It authenticated with the service-role key from Vault, which did not
--      match the key the edge function sees, so the function returned 401.
--
-- pg_net was enabled directly (idempotent here). The job now also sends a
-- dedicated AUTO_PAYOUT_CRON_SECRET (stored in Vault and as an edge function
-- secret of the same name) in x-cron-secret. That secret can do nothing except
-- trigger the payout run, and auto-payout still verifies every payment with
-- Stripe before paying anyone.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.alter_job(
  job_id := (SELECT jobid FROM cron.job WHERE jobname = 'auto-payout-delivered-orders'),
  command := $cmd$
  SELECT net.http_post(
    url := 'https://jwvybofahjxtldjjjdpo.supabase.co/functions/v1/auto-payout',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'),
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'AUTO_PAYOUT_CRON_SECRET')
    ),
    body := '{}'::jsonb
  );
  $cmd$
);
