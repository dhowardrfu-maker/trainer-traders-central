import { useEffect, useMemo, useState } from "react";
import { Img } from "@/components/Img";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Loader2, ShieldCheck, Info, X } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { CARRIERS, type CarrierId } from "@/data/carriers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { loadStripe } from "@stripe/stripe-js/pure";
import { PaymentElement } from "@stripe/react-stripe-js";
import { Elements, useStripe, useElements } from "@stripe/react-stripe-js";

let stripePromise: ReturnType<typeof loadStripe> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

const addressSchema = z.object({
  ship_to_name: z.string().min(2, "Enter the recipient's name").max(100),
  ship_to_line1: z.string().min(3, "Enter the address line").max(120),
  ship_to_line2: z.string().max(120).optional(),
  ship_to_city: z.string().min(2, "Enter your town or city").max(60),
  ship_to_postcode: z
    .string()
    .min(5, "Enter a valid UK postcode")
    .max(8)
    .regex(/^[A-Z0-9 ]+$/i, "Letters, numbers and spaces only"),
});

interface AddressState {
  ship_to_name: string;
  ship_to_line1: string;
  ship_to_line2: string;
  ship_to_city: string;
  ship_to_postcode: string;
}

const ADDRESS_KEY = "plk_checkout_address";

const defaultAddress: AddressState = {
  ship_to_name: "",
  ship_to_line1: "",
  ship_to_line2: "",
  ship_to_city: "",
  ship_to_postcode: "",
};

const loadSavedAddress = (): AddressState => {
  try {
    const saved = sessionStorage.getItem(ADDRESS_KEY);
    if (saved) return { ...defaultAddress, ...JSON.parse(saved) };
  } catch {}
  return defaultAddress;
};

// Buyer Protection Modal
const BuyerProtectionModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative bg-card rounded-3xl shadow-xl p-6 max-w-sm w-full space-y-4 z-10">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <h2 className="font-display font-bold text-lg">Buyer Protection</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">For every purchase made with us, we make sure you're covered.</p>
      <div className="space-y-3">
        <div className="rounded-xl bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-semibold">Refund policy</p>
          <p className="text-xs text-muted-foreground">You can receive a refund if your order:</p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            <li>Was never shipped or is lost</li>
            <li>Arrives damaged</li>
            <li>Is significantly not as described</li>
          </ul>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-semibold">48-hour window</p>
          <p className="text-xs text-muted-foreground">You have 48 hours from confirmed delivery to raise any issues with your order.</p>
        </div>
        <div className="rounded-xl bg-muted/50 p-3 space-y-1">
          <p className="text-sm font-semibold">Secure transactions</p>
          <p className="text-xs text-muted-foreground">Your money is held securely until you confirm receipt. The seller is only paid once you're happy.</p>
        </div>
      </div>
      <Button className="w-full rounded-full font-semibold" onClick={onClose}>Got it</Button>
    </div>
  </div>
);

interface PayFormProps {
  listing: Listing;
  carrierId: CarrierId;
  address: AddressState;
  acceptedOfferPence: number | null;
  clientSecret: string;
  itemPence: number;
  protectionPence: number;
  postagePence: number;
  totalPence: number;
  offerId: string | null;
  onSuccess: (orderId: string) => void;
}

function StripePayForm({
  listing,
  carrierId,
  address,
  acceptedOfferPence,
  clientSecret,
  itemPence,
  protectionPence,
  postagePence,
  totalPence,
  offerId,
  onSuccess,
}: PayFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);

    const { error: stripeErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: parsed.data.ship_to_name,
            address: {
              line1: parsed.data.ship_to_line1,
              line2: parsed.data.ship_to_line2 ?? "",
              city: parsed.data.ship_to_city,
              postal_code: parsed.data.ship_to_postcode.toUpperCase(),
              country: "GB",
            },
          },
        },
      },
    });

    if (stripeErr) {
      toast.error(stripeErr.message ?? "Payment failed");
      setBusy(false);
      return;
    }

    if (paymentIntent?.status !== "succeeded") {
      toast.error("Payment not completed");
      setBusy(false);
      return;
    }

    const carrier = CARRIERS.find((c) => c.id === carrierId)!;
    const { data, error } = await supabase.rpc("create_order", {
      _listing_id: Number(listing.id),
      _carrier: carrierId,
      _service_label: `${carrier.name} · ${carrier.service}`,
      _postage_pence: postagePence,
      _ship_to_name: parsed.data.ship_to_name,
      _ship_to_line1: parsed.data.ship_to_line1,
      _ship_to_line2: parsed.data.ship_to_line2 || null,
      _ship_to_city: parsed.data.ship_to_city,
      _ship_to_postcode: parsed.data.ship_to_postcode.toUpperCase(),
      _offer_id: offerId ?? null,
      _stripe_payment_intent_id: paymentIntent.id,
    });

    setBusy(false);

    if (error || !data) {
      toast.error(error?.message ?? "Order creation failed — contact support");
      return;
    }

    sessionStorage.removeItem(ADDRESS_KEY);
    toast.success("Payment successful — generating your label!");
    onSuccess(data);
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        size="lg"
        className="w-full rounded-full font-semibold"
        disabled={busy || !stripe || !elements}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          `Pay £${(totalPence / 100).toFixed(2)} securely`
        )}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
        <ShieldCheck className="h-3 w-3" />
        Secured by Stripe · Buyer protection included
      </p>
    </form>
  );
}

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<Listing | null>(null);
  const [listingPostagePence, setListingPostagePence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [carrierId, setCarrierId] = useState<CarrierId>("evri");
  const [acceptedOfferPence, setAcceptedOfferPence] = useState<number | null>(null);
  const [showProtectionModal, setShowProtectionModal] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [itemPence, setItemPence] = useState(0);
  const [protectionPence, setProtectionPence] = useState(0);
  const [postagePence, setPostagePence] = useState(0);
  const [totalPence, setTotalPence] = useState(0);
  const [fetchingIntent, setFetchingIntent] = useState(false);

  const [address, setAddress] = useState<AddressState>(loadSavedAddress);

  useEffect(() => {
    try {
      sessionStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
    } catch {}
  }, [address]);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);

      const sample = SAMPLE_LISTINGS.find((l) => l.id === id);
      if (sample) {
        if (!cancelled) { setListing(sample); setLoading(false); }
        return;
      }

      const { data: row, error } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, size_eu, condition, gender, color, description, price_pence, postage_pence, photos, created_at, seller_id")
        .eq("id", Number(id))
        .maybeSingle();

      if (cancelled) return;
      if (error || !row) { setLoading(false); return; }
      setListingPostagePence(row.postage_pence ?? 0);
      setListing(mapDbListing({ ...row, id: String(row.id) }));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!offerId || !user || !id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("offers")
        .select("amount_pence, status, buyer_id, listing_id")
        .eq("id", offerId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.status === "accepted" && data.buyer_id === user.id && String(data.listing_id) === String(id)) {
        setAcceptedOfferPence(data.amount_pence);
        toast.success(`Offer applied — £${(data.amount_pence / 100).toFixed(2)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [offerId, user, id]);

  const carrier = useMemo(() => CARRIERS.find((c) => c.id === carrierId)!, [carrierId]);
  const isSample = listing?.isSample === true;
  const isOwn = !!(user && listing?.seller.id && user.id === listing.seller.id);

  useEffect(() => {
    if (!listing || isSample || isOwn || !user) return;

    let cancelled = false;
    setClientSecret(null);
    setFetchingIntent(true);

    (async () => {
      const { data, error } = await supabase.functions.invoke("create-payment-intent", {
        body: {
          listing_id: Number(listing.id),
          carrier_id: carrierId,
          postage_pence: listingPostagePence,
          offer_id: offerId ?? null,
        },
      });

      if (cancelled) return;

      if (error || !data?.client_secret) {
        toast.error(error?.message ?? "Could not initialise payment");
        setFetchingIntent(false);
        return;
      }

      setClientSecret(data.client_secret);
      setItemPence(data.item_pence);
      setProtectionPence(data.protection_pence);
      setPostagePence(data.postage_pence);
      setTotalPence(data.total_pence);
      setFetchingIntent(false);
    })();

    return () => { cancelled = true; };
  }, [listing, carrierId, listingPostagePence, offerId, isSample, isOwn, user]);

  const handleSuccess = (orderId: string) => {
    navigate(`/order/${orderId}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      {showProtectionModal && <BuyerProtectionModal onClose={() => setShowProtectionModal(false)} />}
      <main className="container py-4 md:py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-1">Checkout</h1>
        <p className="text-sm text-muted-foreground mb-6">Pay securely with Stripe.</p>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !listing ? (
          <p className="text-muted-foreground">Listing not found.</p>
        ) : (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              <section className="rounded-2xl border border-border p-5">
                <h2 className="font-display font-bold text-lg mb-4">Delivery address</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_name">Full name</Label>
                    <Input id="ship_to_name" required value={address.ship_to_name} onChange={(e) => setAddress({ ...address, ship_to_name: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_line1">Address line 1</Label>
                    <Input id="ship_to_line1" required value={address.ship_to_line1} onChange={(e) => setAddress({ ...address, ship_to_line1: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_line2">Address line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="ship_to_line2" value={address.ship_to_line2} onChange={(e) => setAddress({ ...address, ship_to_line2: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ship_to_city">Town / City</Label>
                    <Input id="ship_to_city" required value={address.ship_to_city} onChange={(e) => setAddress({ ...address, ship_to_city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ship_to_postcode">Postcode</Label>
                    <Input id="ship_to_postcode" required placeholder="SK13 8AB" value={address.ship_to_postcode} onChange={(e) => setAddress({ ...address, ship_to_postcode: e.target.value.toUpperCase() })} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border p-5">
                <h2 className="font-display font-bold text-lg mb-4">Payment</h2>
                {isSample ? (
                  <p className="text-sm text-muted-foreground">
                    This is a demo listing — <Link to="/sell" className="underline font-semibold">create a real listing</Link> to take real payments.
                  </p>
                ) : isOwn ? (
                  <p className="text-sm text-destructive">You can't buy your own listing.</p>
                ) : fetchingIntent ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Setting up payment…
                  </div>
                ) : clientSecret ? (
                  <Elements stripe={getStripe()} options={{ clientSecret, appearance: { theme: "stripe" } }}>
                    <StripePayForm
                      listing={listing}
                      carrierId={carrierId}
                      address={address}
                      acceptedOfferPence={acceptedOfferPence}
                      clientSecret={clientSecret}
                      itemPence={itemPence}
                      protectionPence={protectionPence}
                      postagePence={postagePence}
                      totalPence={totalPence}
                      offerId={offerId}
                      onSuccess={handleSuccess}
                    />
                  </Elements>
                ) : (
                  <p className="text-sm text-muted-foreground">Could not load payment. Please go back and try again.</p>
                )}
              </section>
            </div>

            {/* Order summary */}
            <aside className="lg:sticky lg:top-20 self-start">
              <div className="rounded-2xl border border-border p-5 space-y-4">
                <div className="flex gap-3">
                  <Img src={listing.image} alt="" className="h-16 w-16 rounded-lg object-cover bg-muted" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{listing.brand}</p>
                    <p className="font-semibold text-sm truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">UK {listing.sizeUk} · {listing.condition}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <Row label={acceptedOfferPence != null ? "Item (offer price)" : "Item"} value={`£${(itemPence / 100).toFixed(2)}`} />
                  <Row label="Postage" value={`£${(postagePence / 100).toFixed(2)}`} />
                  {/* Buyer protection row with info icon */}
                  <div className="flex justify-between text-muted-foreground">
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                      onClick={() => setShowProtectionModal(true)}
                    >
                      <span>Buyer protection</span>
                      <Info className="h-3.5 w-3.5 text-primary" />
                    </button>
                    <span className="text-foreground font-medium">
                      {protectionPence ? `£${(protectionPence / 100).toFixed(2)}` : "—"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4 flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="font-display font-bold text-2xl">
                    £{totalPence ? (totalPence / 100).toFixed(2) : (listing.price + listingPostagePence / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
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

export default Checkout;
