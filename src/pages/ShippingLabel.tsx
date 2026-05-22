import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Package, Truck } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OrderRow {
  id: string;
  seller_id: string;
  ship_to_name: string;
  ship_to_line1: string;
  ship_to_line2: string | null;
  ship_to_city: string;
  ship_to_postcode: string;
  total_pence: number;
  postage_pence: number;
  status: string;
  sendcloud_qr_url: string | null;
  sendcloud_tracking_number: string | null;
  sendcloud_label_url: string | null;
}

const ShippingLabel = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id || !user) return;
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) { setLoading(false); return; }

      if (data.seller_id !== user.id) {
        toast.error("You don't have access to this order");
        navigate("/profile?tab=orders");
        return;
      }

      setOrder(data as OrderRow);
      if (data.sendcloud_qr_url) setQrUrl(data.sendcloud_qr_url);
      if (data.sendcloud_tracking_number) setTrackingNumber(data.sendcloud_tracking_number);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id, user]);

  const handleGenerateQR = async () => {
    if (!order) return;
    setGenerating(true);

    const { data, error } = await supabase.functions.invoke("create-shipping-label", {
      body: { order_id: order.id },
    });

    setGenerating(false);

    if (error || !data?.qr_url) {
      toast.error(error?.message ?? "Could not generate label — please try again");
      return;
    }

    setQrUrl(data.qr_url);
    setTrackingNumber(data.tracking_number);
    toast.success("QR code generated — take it to the Post Office!");
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8 max-w-2xl">
        <button
          onClick={() => navigate("/profile?tab=orders")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </button>

        <h1 className="font-display font-bold text-3xl tracking-tight mb-1">
          Ship this order
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Generate a QR code and take it to any Royal Mail Post Office.
        </p>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="space-y-4">

            {/* Order details */}
            <div className="rounded-2xl border border-border p-5 space-y-3">
              <h2 className="font-display font-bold text-lg">Delivery address</h2>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="font-semibold text-foreground">{order.ship_to_name}</p>
                <p>{order.ship_to_line1}</p>
                {order.ship_to_line2 && <p>{order.ship_to_line2}</p>}
                <p>{order.ship_to_city}</p>
                <p className="font-mono font-bold text-foreground">{order.ship_to_postcode}</p>
              </div>
            </div>

            {/* Shipping service */}
            <div className="rounded-2xl border border-border p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Royal Mail Tracked 48</p>
                <p className="text-sm text-muted-foreground">Drop off at any Post Office · QR code — no printing needed</p>
              </div>
            </div>

            {/* QR code or generate button */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              {qrUrl ? (
                <>
                  <h2 className="font-display font-bold text-lg">Your QR code</h2>
                  <p className="text-sm text-muted-foreground">Show this at the Post Office. Staff will scan it and print the label.</p>
                  <div className="flex justify-center">
                    <img
                      src={qrUrl}
                      alt="Shipping QR code"
                      className="w-64 h-64 rounded-xl border border-border"
                    />
                  </div>
                  {trackingNumber && (
                    <p className="text-xs text-muted-foreground text-center font-mono">
                      Tracking: {trackingNumber}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full rounded-full"
                    onClick={() => window.open(qrUrl, "_blank")}
                  >
                    Open full size
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="font-display font-bold text-lg">Ready to ship?</h2>
                  <p className="text-sm text-muted-foreground">
                    Click the button below to generate your Royal Mail QR code. You'll need to take it to a Post Office within 28 days.
                  </p>
                  <Button
                    className="w-full rounded-full font-semibold"
                    onClick={handleGenerateQR}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating QR code…
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Generate QR code
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>

          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
};

export default ShippingLabel;