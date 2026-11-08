-- Server-side photo moderation.
--
-- Until now an uploaded photo was only moderated if the *browser* chose to
-- call moderate-image afterwards. Anyone uploading straight to storage skipped
-- it, and the listing-photos bucket is public, so the file was reachable by
-- URL regardless. This trigger calls moderate-image (server mode) for every
-- object created or overwritten in listing-photos; the function deletes the
-- object if it is definitively rejected.
--
-- Fail-open by design (same as the browser flow): any error here, a missing
-- Vault secret, or a moderation outage lets the upload through. The trigger
-- can never block or fail an upload.
--
-- Needs: pg_net (enabled in 20261108130000) and the SUPABASE_SERVICE_ROLE_KEY
-- Vault secret (the same one the auto-payout cron job uses).

CREATE OR REPLACE FUNCTION public.moderate_new_listing_photo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  service_key text;
BEGIN
  IF NEW.bucket_id IS DISTINCT FROM 'listing-photos' THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT decrypted_secret INTO service_key
    FROM vault.decrypted_secrets
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';

    IF service_key IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://jwvybofahjxtldjjjdpo.supabase.co/functions/v1/moderate-image',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_key
        ),
        body := jsonb_build_object('bucket', NEW.bucket_id, 'path', NEW.name),
        timeout_milliseconds := 30000
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'moderate_new_listing_photo skipped: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Trigger-only: nobody needs to call it over the API.
REVOKE EXECUTE ON FUNCTION public.moderate_new_listing_photo() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS moderate_listing_photo_insert ON storage.objects;
CREATE TRIGGER moderate_listing_photo_insert
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'listing-photos')
  EXECUTE FUNCTION public.moderate_new_listing_photo();

-- Overwrites (e.g. avatar upsert) arrive as UPDATEs, not INSERTs.
DROP TRIGGER IF EXISTS moderate_listing_photo_update ON storage.objects;
CREATE TRIGGER moderate_listing_photo_update
  AFTER UPDATE ON storage.objects
  FOR EACH ROW
  WHEN (NEW.bucket_id = 'listing-photos' AND NEW.version IS DISTINCT FROM OLD.version)
  EXECUTE FUNCTION public.moderate_new_listing_photo();
