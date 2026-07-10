-- Trainer of the Week: a single manually-curated "pick" the founder sets
-- via a direct SQL update. Deliberately no admin UI for v1 — just a
-- key/value row updated by hand in the SQL Editor when the pick changes.
-- Empty table = feature renders nothing, no placeholder shown.
CREATE TABLE public.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_settings IS
  'Small key/value store for single manually-curated site settings, e.g. trainer_of_the_week -> { "listing_id": 123 }.';

-- Public read access — this only ever holds non-sensitive display config,
-- never anything user-specific or private.
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_settings are publicly readable"
  ON public.site_settings FOR SELECT
  USING (true);

-- No INSERT/UPDATE/DELETE policy for regular users — you'll set/change
-- the pick directly in the Supabase SQL Editor with your own admin
-- credentials, not through the app.