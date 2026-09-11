-- Adds one new column to store whether a seller bought shipment protection
-- (Sendcloud Shipment Protection, underwritten by XCover, a third party --
-- not PrelovedKicks) and how much was charged for it, in pence.
--
-- This migration only adds a column with a default of 0. It does not touch
-- create_order, the orders RLS policies, or any existing column. Every
-- existing order and every order created before checkout is updated to use
-- this will simply have shipping_protection_fee_pence = 0, which is
-- indistinguishable from today's behaviour.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_protection_fee_pence integer NOT NULL DEFAULT 0;
