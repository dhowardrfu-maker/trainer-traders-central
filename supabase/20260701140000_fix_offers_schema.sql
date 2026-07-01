-- OfferPanel.tsx already references offers.message, offers.parent_offer_id,
-- and a 'countered' status that were never added to the schema. Add them so
-- the existing counter-offer / message UI actually works against the database.

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS parent_offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TYPE public.offer_status ADD VALUE IF NOT EXISTS 'countered';