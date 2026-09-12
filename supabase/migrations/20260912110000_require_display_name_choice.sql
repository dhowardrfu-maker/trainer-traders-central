-- Tracks whether a user has actually chosen their own display name, as
-- opposed to just having the trigger's auto-generated fallback (email
-- prefix or username). Needed because display_name is now always
-- non-null from the moment of signup (fixed in the previous migration),
-- so null-ness can no longer be used to detect "never set one".
--
-- Defaults to false so every NEW signup goes through the naming step,
-- but every EXISTING account is immediately backfilled to true here so
-- current users are never retroactively interrupted by a new gate for a
-- name they may already be using and are known by.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS has_chosen_display_name boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET has_chosen_display_name = true WHERE has_chosen_display_name = false;
