import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Package } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReviewForm } from "@/components/ReviewForm";

interface OrderRow {
  id: string;
  listing_id: string | number;
  buyer_id: string;
  seller_id: string;
  service_label: string;
  total_pence: number;
  price_pence: number;
  postage_pence: number;
  ship_to_name: string;
  ship_to_line1: string;
  ship_to_line2: string | null;
  ship_to_city: string;
  ship_to_postcode: string;
  tracking_code: string;
  sendcloud_tracking_number: string | null;
  status: string;
  created_at: string;
}

const OrderConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }
      setOrder(data as OrderRow);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const trackingNumber = order?.sendcloud_tracking_number || order?.tracking_code;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-3xl">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 print:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </button>

        {loading ? (
          <Skeleton className="h-[500px] w-full rounded-2xl" />
        ) : !order ? (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold">Order not found</p>
            <Button asChild className="mt-6"><Link to="/">Back to feed</Link></Button>
          </div>
        ) : (
          <>
            {/* Confirmation hero */}
            <div className="text-center mb-8">
              <div className="inline-flex h-14 w-14 rounded-full bg-primary text-primary-foreground items-center justify-center mb-3">
                <Check className="h-7 w-7" strokeWidth={3} />
              </div>
              <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight">
                Order confirmed!
              </h1>
              <p className="text-muted-foreground mt-1.5 max-w-sm mx-auto">
                Payment received. The seller has been notified and will ship your kicks via Evri.
              </p>
            </div>

            {/* Delivery details card */}
            <div className="rounded-3xl border-2 border-foreground bg-card overflow-hidden shadow-elegant">
              {/* Header strip */}
              <div className="bg-foreground text-background px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span className="font-display font-bold tracking-wide">EVRI STANDARD DELIVERY</span>
                </div>
                <span className="text-xs font-mono opacity-70">2–4 working days</span>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Delivering to</p>
                  <p className="font-semibold mt-1">{order.ship_to_name}</p>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {order.ship_to_line1}<br />
                    {order.ship_to_line2 && <>{order.ship_to_line2}<br /></>}
                    {order.ship_to_city}<br />
                    <span className="font-mono font-bold text-foreground tracking-wider">{order.ship_to_postcode}</span>
                  </p>
                </div>

                {trackingNumber && (
                  <div className="border-t border-dashed border-border pt-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tracking number</p>
                    <p className="font-mono font-bold text-lg mt-1 break-all">{trackingNumber}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Track at{" "}
                      <a
                        href={`https://www.evri.com/track-a-parcel#/${trackingNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        evri.com
                      </a>
                    </p>
                  </div>
                )}

                {!trackingNumber && (
                  <div className="border-t border-dashed border-border pt-4">
                    <p className="text-sm text-muted-foreground">
                      Tracking will appear here once the seller ships your order.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-muted/40 px-6 py-3 text-[11px] text-muted-foreground font-mono uppercase tracking-wider flex justify-between">
                <span>PrelovedKicks · Buyer Protection</span>
                <span>{new Date(order.created_at).toLocaleDateString("en-GB")}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              <Button variant="ghost" asChild className="rounded-full font-semibold ml-auto">
                <Link to="/">Continue shopping</Link>
              </Button>
            </div>

            {/* Order summary */}
            <div className="mt-6 rounded-2xl border border-border p-5">
              <h2 className="font-display font-bold text-lg mb-3">Order summary</h2>
              <div className="space-y-2 text-sm">
                <Row label="Item" value={`£${(order.price_pence / 100).toFixed(2)}`} />
                <Row label="Postage (Evri Standard)" value={`£${(order.postage_pence / 100).toFixed(2)}`} />
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Total paid</span>
                  <span className="font-display text-lg">£{(order.total_pence / 100).toFixed(2)}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Order ref: <span className="font-mono">{order.id.slice(0, 8).toUpperCase()}</span>
              </p>
            </div>

            {user && order.buyer_id === user.id && (
              <div className="mt-6">
                <ReviewForm orderId={order.id} buyerId={order.buyer_id} sellerId={order.seller_id} />
              </div>
            )}
          </>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-muted-foreground">
    <span>{label}</span>
    <span className="text-foreground font-medium">{value}</span>
  </div>
);

export default OrderConfirmation;