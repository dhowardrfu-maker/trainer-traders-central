-- Orders / postage flow for PrelovedKicks
CREATE TYPE public.order_status AS ENUM ('pending_postage', 'label_created', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.carrier AS ENUM ('royal_mail', 'inpost', 'evri');

CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  price_pence INTEGER NOT NULL,
  postage_pence INTEGER NOT NULL DEFAULT 0,
  total_pence INTEGER NOT NULL,
  carrier public.carrier NOT NULL,
  service_label TEXT NOT NULL,
  ship_to_name TEXT NOT NULL,
  ship_to_line1 TEXT NOT NULL,
  ship_to_line2 TEXT,
  ship_to_city TEXT NOT NULL,
  ship_to_postcode TEXT NOT NULL,
  ship_to_country TEXT NOT NULL DEFAULT 'United Kingdom',
  tracking_code TEXT NOT NULL,
  qr_payload TEXT NOT NULL,
  status public.order_status NOT NULL DEFAULT 'label_created',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_buyer ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_id);
CREATE INDEX idx_orders_listing ON public.orders(listing_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view their orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = seller_id);

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- When an order is created, mark the listing as sold
CREATE OR REPLACE FUNCTION public.mark_listing_sold()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.listings
  SET status = 'sold', updated_at = now()
  WHERE id = NEW.listing_id AND status = 'active';
  RETURN NEW;
END;
$$;

CREATE TRIGGER mark_listing_sold_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.mark_listing_sold();