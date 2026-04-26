-- ============ ENUMS ============
CREATE TYPE public.listing_condition AS ENUM (
  'new_with_tags', 'like_new', 'very_good', 'good', 'worn'
);
CREATE TYPE public.listing_status AS ENUM ('draft', 'active', 'sold', 'removed');
CREATE TYPE public.listing_gender AS ENUM ('mens', 'womens', 'unisex', 'kids');

-- ============ LISTINGS ============
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT,
  size_uk NUMERIC(3,1) NOT NULL,
  size_eu NUMERIC(4,1),
  condition public.listing_condition NOT NULL,
  gender public.listing_gender NOT NULL DEFAULT 'unisex',
  color TEXT,
  price_pence INT NOT NULL CHECK (price_pence >= 100),
  description TEXT,
  photos TEXT[] NOT NULL DEFAULT '{}',
  status public.listing_status NOT NULL DEFAULT 'active',
  view_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_status_created ON public.listings (status, created_at DESC);
CREATE INDEX idx_listings_brand ON public.listings (lower(brand));
CREATE INDEX idx_listings_seller ON public.listings (seller_id);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Public can see active and sold listings
CREATE POLICY "Active and sold listings are viewable by everyone"
  ON public.listings FOR SELECT
  USING (status IN ('active', 'sold'));

-- Sellers can see their own (incl. drafts/removed)
CREATE POLICY "Sellers can view their own listings"
  ON public.listings FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Authenticated users can create their own listings"
  ON public.listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own listings"
  ON public.listings FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own listings"
  ON public.listings FOR DELETE
  USING (auth.uid() = seller_id);

-- updated_at trigger (function created in earlier migration)
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-photos', 'listing-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view listing photos
CREATE POLICY "Listing photos are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

-- Authenticated users can upload to their own folder (folder = their user id)
CREATE POLICY "Users can upload their own listing photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own listing photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own listing photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );