import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Package, AlertTriangle, XCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReviewForm } from "@/components/ReviewForm";
import { toast } from "sonner";

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
  cancellation_requested_by: string | null;
  cancellation_reason: string | null;
  cancellation_agreed: boolean | null;
  dispute_raised_at: string | null;
  dispute_description: string | null;
  dispute_images: string[] | null;
  dispute_status: string | null;
}

// Helper — insert a notification row directly into the notifications table
const notify = async (userId: string, type: string, title: string, body: string | null, link: string | null) => {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link,
    read: false,
  });
};

const OrderConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Cancellation state
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Dispute state
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeImages, setDisputeImages] = useState<File[]>([]);
  const [disputePreviews, setDisputePreviews] = useState<string[]>([]);

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

  useEffect(() => {
    const urls = disputeImages.map((f) => URL.createObjectURL(f));
    setDisputePreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [disputeImages]);

  const isBuyer = user?.id === order?.buyer_id;
  const isSeller = user?.id === order?.seller_id;
  const canCancel = ["pending_postage", "label_created"].includes(order?.status ?? "");
  const canRaiseDispute = order?.status === "shipped";
  const cancellationPending = !!order?.cancellation_requested_by && order?.cancellation_agreed !== true && order?.status !== 'cancelled';
  const otherPartyRequestedCancel = cancellationPending && order?.cancellation_requested_by !== user?.id;
  const iRequestedCancel = cancellationPending && order?.cancellation_requested_by === user?.id;

  // REQUEST CANCELLATION
  const handleRequestCancel = async () => {
    if (!cancelReason.trim()) { toast.error("Please provide a reason for cancellation"); return; }
    if (!user || !order) return;
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({
        cancellation_requested_by: user.id,
        cancellation_reason: cancelReason.trim(),
      })
      .eq("id", order.id);
    if (error) { setBusy(false); toast.error("Couldn't submit cancellation request"); return; }

    // Notify the other party
    const otherPartyId = isBuyer ? order.seller_id : order.buyer_id;
    const requesterLabel = isBuyer ? "The buyer" : "The seller";
    await notify(
      otherPartyId,
      "cancellation_requested",
      `${requesterLabel} has requested to cancel an order`,
      cancelReason.trim(),
      `/order/${order.id}`
    );

    setBusy(false);
    toast.success("Cancellation request sent — waiting for the other party to agree");
    setShowCancelForm(false);
    setOrder((prev) => prev ? { ...prev, cancellation_requested_by: user.id, cancellation_reason: cancelReason.trim() } : prev);
  };

  // AGREE TO CANCEL
  const handleAgreeCancel = async () => {
    if (!user || !order) return;
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ cancellation_agreed: true, status: "cancelled" })
      .eq("id", order.id);
    if (error) { setBusy(false); toast.error("Couldn't process cancellation"); return; }
    await supabase.from("listings").update({ status: "active" }).eq("id", Number(order.listing_id));
    const { error: refundErr } = await supabase.functions.invoke("create-refund", { body: { order_id: order.id } });

    // Notify the party who originally requested the cancellation
    if (order.cancellation_requested_by) {
      await notify(
        order.cancellation_requested_by,
        "cancellation_agreed",
        "Cancellation agreed — refund issued",
        "The other party agreed to cancel. A full refund has been issued.",
        `/order/${order.id}`
      );
    }

    setBusy(false);
    if (refundErr) {
      toast.error("Order cancelled but refund failed — please contact support@prelovedkicks.co.uk");
    } else {
      toast.success("Order cancelled and refund issued");
    }
    setOrder((prev) => prev ? { ...prev, cancellation_agreed: true, status: "cancelled" } : prev);
  };

  // RAISE DISPUTE
  const handleRaiseDispute = async () => {
    if (!disputeDescription.trim()) { toast.error("Please describe the issue"); return; }
    if (!user || !order) return;
    setBusy(true);
    const imagePaths: string[] = [];
    for (const file of disputeImages) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `disputes/${order.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (!upErr) imagePaths.push(path);
    }
    const { error } = await supabase
      .from("orders")
      .update({
        dispute_raised_at: new Date().toISOString(),
        dispute_description: disputeDescription.trim(),
        dispute_images: imagePaths.length ? imagePaths : null,
        dispute_status: "open",
        status: "disputed",
      })
      .eq("id", order.id);
    if (error) { setBusy(false); toast.error("Couldn't raise dispute"); return; }

    // Notify seller
    await notify(
      order.seller_id,
      "dispute_raised",
      "A buyer has raised an issue with their order",
      disputeDescription.trim(),
      `/order/${order.id}`
    );

    setBusy(false);
    toast.success("Issue raised — the seller has been notified");
    setShowDisputeForm(false);
    setOrder((prev) => prev ? { ...prev, dispute_status: "open", status: "disputed" } : prev);
  };

  // CONFIRM RECEIPT
  const handleConfirmReceipt = async () => {
    if (!user || !order) return;
    setBusy(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: "delivered", evri_delivered_at: new Date().toISOString() } as never)
      .eq("id", order.id);
    if (error) { setBusy(false); toast.error("Couldn't confirm receipt"); return; }
    await supabase.functions.invoke("create-payout", { body: { order_id: order.id } });

    // Notify seller — sale completed
    await notify(
      order.seller_id,
      "sale_completed",
      "Sale completed — payout on its way! 🎉",
      "The buyer confirmed receipt. Your payout is being processed.",
      `/order/${order.id}`
    );

    // Notify buyer — item delivered
    await notify(
      order.buyer_id,
      "item_delivered",
      "Great choice! Your item has been marked as received",
      "We hope you love your kicks. Enjoy!",
      `/order/${order.id}`
    );

    setBusy(false);
    toast.success("Receipt confirmed — the seller will be paid out");
    setOrder((prev) => prev ? { ...prev, status: "delivered" } : prev);
  };

  // SELLER: issue refund on dispute
  const handleSellerRefund = async () => {
    if (!user || !order) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("create-refund", { body: { order_id: order.id } });
    if (error) { setBusy(false); toast.error("Couldn't issue refund"); return; }
    await supabase.from("orders").update({ dispute_status: "refunded", status: "cancelled" } as never).eq("id", order.id);

    // Notify buyer
    await notify(
      order.buyer_id,
      "dispute_refunded",
      "Refund issued — dispute resolved",
      "The seller has issued a full refund. It may take a few days to reach your account.",
      `/order/${order.id}`
    );

    setBusy(false);
    toast.success("Full refund issued to the buyer");
    setOrder((prev) => prev ? { ...prev, dispute_status: "refunded", status: "cancelled" } : prev);
  };

  // SELLER: request return
  const handleSellerRequestReturn = async () => {
    if (!user || !order) return;
    setBusy(true);
    await supabase.from("orders").update({ dispute_status: "return_requested" } as never).eq("id", order.id);

    // Notify buyer
    await notify(
      order.buyer_id,
      "return_requested",
      "The seller has requested a return",
      "A return label will be generated for you shortly.",
      `/order/${order.id}`
    );

    setBusy(false);
    toast.success("Return requested — a return label will be generated for the buyer");
    setOrder((prev) => prev ? { ...prev, dispute_status: "return_requested" } : prev);
  };

  const trackingNumber = order?.sendcloud_tracking_number || null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-3xl">
        <button
          onClick={() => navigate("/profile")}
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
            {/* Cancelled banner */}
            {order.status === "cancelled" && (
              <div className="mb-6 rounded-2xl bg-destructive/10 border border-destructive/20 p-4 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
                <div>
                  <p className="font-semibold text-destructive">Order cancelled</p>
                  <p className="text-sm text-muted-foreground">A full refund has been issued.</p>
                </div>
              </div>
            )}

            {/* Disputed banner */}
            {order.status === "disputed" && (
              <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-800">Dispute in progress</p>
                  <p className="text-sm text-amber-700">This order has an open dispute. The seller has been notified.</p>
                </div>
              </div>
            )}

            {/* Cancellation pending — other party requested */}
            {otherPartyRequestedCancel && (
              <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <p className="font-semibold text-amber-800">
                    {isBuyer ? "The seller has requested to cancel this order" : "The buyer has requested to cancel this order"}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Reason given</p>
                  <p className="text-sm">{order.cancellation_reason}</p>
                </div>
                <p className="text-sm text-amber-700">Do you agree to cancel this order?</p>
                <div className="flex gap-3">
                  <Button className="rounded-full font-semibold" onClick={handleAgreeCancel} disabled={busy}>
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Agree to cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full font-semibold"
                    onClick={() => window.location.href = "mailto:support@prelovedkicks.co.uk?subject=Order%20Cancellation%20Dispute&body=Order%20ID:%20" + order.id}
                  >
                    Contact support
                  </Button>
                </div>
              </div>
            )}

            {/* Cancellation pending — I requested */}
            {iRequestedCancel && (
              <div className="mb-6 rounded-2xl bg-muted p-4 flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-muted-foreground animate-spin shrink-0" />
                <div>
                  <p className="font-semibold">Cancellation request sent</p>
                  <p className="text-sm text-muted-foreground">Waiting for the other party to agree. They'll be notified shortly.</p>
                </div>
              </div>
            )}

            {/* Confirmation hero */}
            {order.status !== "cancelled" && (
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
            )}

            {/* Delivery details card */}
            {order.status !== "cancelled" && (
              <div className="rounded-3xl border-2 border-foreground bg-card overflow-hidden shadow-elegant">
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

                  {trackingNumber ? (
                    <div className="border-t border-dashed border-border pt-4">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tracking number</p>
                      <p className="font-mono font-bold text-lg mt-1 break-all">{trackingNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Track at{" "}
                        <a href={`https://www.evri.com/track-a-parcel#/${trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          evri.com
                        </a>
                      </p>
                    </div>
                  ) : (
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
            )}

            {/* BUYER: Item received / raise issue (once shipped) */}
            {isBuyer && order.status === "shipped" && !order.dispute_raised_at && (
              <div className="mt-6 rounded-2xl border border-border p-5 space-y-3">
                <h2 className="font-display font-bold text-lg">Has your item arrived?</h2>
                <p className="text-sm text-muted-foreground">Once you confirm receipt, the seller will be paid. You have 48 hours from delivery to raise any issues.</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    className="rounded-full font-semibold gap-2"
                    onClick={handleConfirmReceipt}
                    disabled={busy}
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Item received, all ok
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full font-semibold gap-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                    onClick={() => setShowDisputeForm(true)}
                    disabled={busy}
                  >
                    <AlertTriangle className="h-4 w-4" /> I have an issue
                  </Button>
                </div>

                {showDisputeForm && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <p className="text-sm font-semibold">Describe your issue</p>
                    <Textarea
                      placeholder="Please describe the problem with your order in as much detail as possible..."
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      rows={4}
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground">Add photos (optional)</p>
                    <div className="flex flex-wrap gap-2">
                      {disputePreviews.map((src, i) => (
                        <div key={i} className="relative h-20 w-20">
                          <img src={src} className="h-full w-full object-cover rounded-xl" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
                            onClick={() => setDisputeImages((prev) => prev.filter((_, idx) => idx !== i))}
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}
                      {disputeImages.length < 4 && (
                        <label className="h-20 w-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <input type="file" hidden accept="image/*" multiple onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            setDisputeImages((prev) => [...prev, ...files].slice(0, 4));
                          }} />
                        </label>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <Button className="rounded-full font-semibold" onClick={handleRaiseDispute} disabled={busy}>
                        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Submit issue
                      </Button>
                      <Button variant="ghost" className="rounded-full" onClick={() => setShowDisputeForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SELLER: dispute resolution options */}
            {isSeller && order.status === "disputed" && order.dispute_status === "open" && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <h2 className="font-semibold text-amber-800">The buyer has raised an issue</h2>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Buyer's description</p>
                  <p className="text-sm">{order.dispute_description}</p>
                </div>
                {order.dispute_images && order.dispute_images.length > 0 && (
                  <p className="text-xs text-muted-foreground">{order.dispute_images.length} photo(s) attached — contact support to view</p>
                )}
                <p className="text-sm text-amber-700">How would you like to resolve this?</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="rounded-full font-semibold"
                    onClick={handleSellerRequestReturn}
                    disabled={busy}
                  >
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Request return
                  </Button>
                  <Button
                    className="rounded-full font-semibold bg-destructive hover:bg-destructive/90"
                    onClick={handleSellerRefund}
                    disabled={busy}
                  >
                    {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Issue full refund
                  </Button>
                </div>
              </div>
            )}

            {/* Return requested status */}
            {order.dispute_status === "return_requested" && (
              <div className="mt-6 rounded-2xl bg-muted p-4 flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold">Return requested</p>
                  <p className="text-sm text-muted-foreground">A return label is being generated. The buyer will be notified shortly.</p>
                </div>
              </div>
            )}

            {/* PRE-SHIPPING CANCELLATION */}
            {canCancel && !cancellationPending && order.status !== "cancelled" && (
              <div className="mt-6 print:hidden">
                {!showCancelForm ? (
                  <button
                    className="text-sm text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
                    onClick={() => setShowCancelForm(true)}
                  >
                    Request cancellation
                  </button>
                ) : (
                  <div className="rounded-2xl border border-destructive/30 p-5 space-y-3">
                    <h2 className="font-semibold text-destructive">Request cancellation</h2>
                    <p className="text-sm text-muted-foreground">Please provide a reason. The other party must agree before the order is cancelled.</p>
                    <Textarea
                      placeholder="Why do you need to cancel this order?"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex gap-3">
                      <Button
                        className="rounded-full font-semibold bg-destructive hover:bg-destructive/90"
                        onClick={handleRequestCancel}
                        disabled={busy}
                      >
                        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Send cancellation request
                      </Button>
                      <Button variant="ghost" className="rounded-full" onClick={() => setShowCancelForm(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2 print:hidden">
              <Button variant="ghost" asChild className="rounded-full font-semibold ml-auto">
                <Link to="/">Back to feed</Link>
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

            {user && order.buyer_id === user.id && order.status === "delivered" && (
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
