ALTER TABLE public.listings
  ADD COLUMN tag_verified boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.listings.tag_verified IS
  'Set once, at listing-creation time, from the tag-scan check in the Sell flow (style code matched a trusted retailer, and no factory-code/country mismatch for brands where that check exists). Not editable after creation. A false value means unverified, not suspicious — most sellers will simply skip the scan step.';
