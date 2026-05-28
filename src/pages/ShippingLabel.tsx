import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Package, Truck } from "lucide-react";
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
  const [labelUrl, setLabelUrl] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
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
      if (data.sendcloud_label_url) setLabelUrl(data.sendcloud_label_url);
      if (data.sendcloud_tracking_number) setTrackingNumber(data.sendcloud_tracking_number);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id, user]);

  const openLabel = (url: string) => {
    if (url.startsWith("data:application/pdf;base64,")) {
      const base64 = url.split(",")[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "evri-shipping-label.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } else {
      window.open(url, "_blank");
    }
  };

  const handleGenerateLabel = async () => {
    if (!order) return;
    setGenerating(true);

    const { data, error } = await supabase.functions.invoke("create-shipping-label", {
      body: { order_id: order.id },
    });

    setGenerating(false);

    if (error || !data?.label_url) {
      toast.error(error?.message ?? "Could not generate label — please try again");
      return;
    }

    setLabelUrl(data.label_url);
    setTrackingNumber(data.tracking_number);
    toast.success("Label generated — print it and drop off at any Evri ParcelShop!");
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
          Generate your shipping label and drop off at any Evri ParcelShop.
        </p>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !order ? (
          <p className="text-muted-foreground">Order not found.</p>
        ) : (
          <div className="space-y-4">

            {/* Delivery address */}
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
                <p className="font-semibold">Evri Standard Delivery</p>
                <p className="text-sm text-muted-foreground">Print label · Drop off at any Evri ParcelShop</p>
              </div>
            </div>

            {/* Label or generate button */}
            <div className="rounded-2xl border border-border p-5 space-y-4">
              {labelUrl ? (
                <>
                  <h2 className="font-display font-bold text-lg">Your shipping label is ready</h2>
                  <p className="text-sm text-muted-foreground">
                    Print the label, attach it to your parcel, and drop it off at any Evri ParcelShop.
                  </p>
                  {trackingNumber && (
                    <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded-lg">
                      Tracking: {trackingNumber}
                    </p>
                  )}
                  {labelUrl.startsWith("data:application/pdf") && (
                    <iframe
                      src={labelUrl}
                      className="w-full rounded-lg border border-border"
                      style={{ height: "500px" }}
                      title="Shipping label"
                    />
                  )}
                  <Button
                    className="w-full rounded-full font-semibold"
                    onClick={() => openLabel(labelUrl)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download label (PDF)
                  </Button>
                </>
              ) : (
                <>
                  <h2 className="font-display font-bold text-lg">Ready to ship?</h2>
                  <p className="text-sm text-muted-foreground">
                    Click below to generate your Evri shipping label. Print it, attach to your parcel and drop off at any Evri ParcelShop.
                  </p>
                  <Button
                    className="w-full rounded-full font-semibold"
                    onClick={handleGenerateLabel}
                    disabled={generating}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generating label…
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 mr-2" />
                        Generate shipping label
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
