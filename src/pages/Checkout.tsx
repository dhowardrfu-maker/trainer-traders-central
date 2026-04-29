import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Loader2, Check, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { CARRIERS, generateTrackingCode, type CarrierId } from "@/data/carriers";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const offerId = params.get("offer");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [carrierId, setCarrierId] = useState<CarrierId>("royal_mail");
  const [busy, setBusy] = useState(false);
  const [acceptedOfferPence, setAcceptedOfferPence] = useState<number | null>(null);
  const [address, setAddress] = useState({
    ship_to_name: "",
    ship_to_line1: "",
    ship_to_line2: "",
    ship_to_city: "",
    ship_to_postcode: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);

      const sample = SAMPLE_LISTINGS.find((l) => l.id === id);
      if (sample) {
        if (!cancelled) {
          setListing(sample);
          setLoading(false);
        }
        return;
      }

      const { data: row, error } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, size_eu, condition, gender, color, description, price_pence, photos, created_at, seller_id")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !row) {
        setLoading(false);
        return;
      }

      setListing(mapDbListing({ ...row }));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const carrier = useMemo(
    () => CARRIERS.find((c) => c.id === carrierId)!,
    [carrierId]
  );

  const total = listing ? listing.price + carrier.pricePence / 100 : 0;
  const isSample = listing?.isSample === true;
  const isOwn = !!(user && listing?.seller.id && user.id === listing.seller.id);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !user) return;

    const parsed = addressSchema.safeParse(address);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    if (isOwn) {
      toast.error("You can't buy your own listing");
      return;
    }

    if (isSample) {
      // Demo listings aren't in the DB — show a friendly toast and skip persistence
      toast.success("Demo checkout complete!", {
        description: "Sign up real listings to generate real orders + QR labels.",
      });
      return;
    }

    setBusy(true);
    const tracking = generateTrackingCode(carrierId);
    const qrPayload = JSON.stringify({
      v: 1,
      brand: "PrelovedKicks",
      carrier: carrierId,
      service: carrier.service,
      tracking,
      ship_to: {
        name: parsed.data.ship_to_name,
        postcode: parsed.data.ship_to_postcode.toUpperCase(),
      },
      ts: Date.now(),
    });

    const { data, error } = await supabase
      .from("orders")
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller.id!,
        price_pence: Math.round(listing.price * 100),
        postage_pence: carrier.pricePence,
        total_pence: Math.round(listing.price * 100) + carrier.pricePence,
        carrier: carrierId,
        service_label: `${carrier.name} · ${carrier.service}`,
        ship_to_name: parsed.data.ship_to_name,
        ship_to_line1: parsed.data.ship_to_line1,
        ship_to_line2: parsed.data.ship_to_line2 || null,
        ship_to_city: parsed.data.ship_to_city,
        ship_to_postcode: parsed.data.ship_to_postcode.toUpperCase(),
        tracking_code: tracking,
        qr_payload: qrPayload,
        status: "label_created",
      })
      .select("id")
      .single();

    setBusy(false);
    if (error || !data) {
      toast.error(error?.message ?? "Couldn't place order");
      return;
    }

    toast.success("Order placed — generating your label");
    navigate(`/order/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8 max-w-4xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-1">
          Checkout
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pick how it ships. Your QR label is generated instantly after payment.
        </p>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !listing ? (
          <p className="text-muted-foreground">Listing not found.</p>
        ) : (
          <form onSubmit={handlePay} className="grid lg:grid-cols-[1fr_380px] gap-6">
            <div className="space-y-6">
              {/* Carriers */}
              <section className="rounded-2xl border border-border p-5">
                <h2 className="font-display font-bold text-lg mb-1">Postage</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose your carrier — same QR works at the drop-off point.
                </p>
                <div className="space-y-2.5">
                  {CARRIERS.map((c) => {
                    const Icon = c.icon;
                    const active = c.id === carrierId;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setCarrierId(c.id)}
                        className={cn(
                          "w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all",
                          active
                            ? "border-primary bg-primary-soft/40"
                            : "border-border hover:border-foreground/30"
                        )}
                      >
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                          active ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-sm text-muted-foreground">· {c.service}</span>
                            {c.badge && (
                              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                                {c.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                          <p className="text-xs font-medium mt-1">{c.eta}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-display font-bold">£{(c.pricePence / 100).toFixed(2)}</p>
                          {active && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1">
                              <Check className="h-3 w-3" /> Selected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Address */}
              <section className="rounded-2xl border border-border p-5">
                <h2 className="font-display font-bold text-lg mb-4">Delivery address</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_name">Full name</Label>
                    <Input id="ship_to_name" required value={address.ship_to_name}
                      onChange={(e) => setAddress({ ...address, ship_to_name: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_line1">Address line 1</Label>
                    <Input id="ship_to_line1" required value={address.ship_to_line1}
                      onChange={(e) => setAddress({ ...address, ship_to_line1: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="ship_to_line2">Address line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Input id="ship_to_line2" value={address.ship_to_line2}
                      onChange={(e) => setAddress({ ...address, ship_to_line2: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ship_to_city">Town / City</Label>
                    <Input id="ship_to_city" required value={address.ship_to_city}
                      onChange={(e) => setAddress({ ...address, ship_to_city: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ship_to_postcode">Postcode</Label>
                    <Input id="ship_to_postcode" required placeholder="SW1A 1AA" value={address.ship_to_postcode}
                      onChange={(e) => setAddress({ ...address, ship_to_postcode: e.target.value.toUpperCase() })} />
                  </div>
                </div>
              </section>
            </div>

            {/* Summary */}
            <aside className="lg:sticky lg:top-20 self-start">
              <div className="rounded-2xl border border-border p-5 space-y-4">
                <div className="flex gap-3">
                  <img src={listing.image} alt="" className="h-16 w-16 rounded-lg object-cover bg-muted" />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{listing.brand}</p>
                    <p className="font-semibold text-sm truncate">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">UK {listing.sizeUk} · {listing.condition}</p>
                  </div>
                </div>

                <div className="border-t border-border pt-4 space-y-2 text-sm">
                  <Row label="Item" value={`£${listing.price.toFixed(2)}`} />
                  <Row label={`Postage (${carrier.name})`} value={`£${(carrier.pricePence / 100).toFixed(2)}`} />
                </div>
                <div className="border-t border-border pt-4 flex justify-between items-baseline">
                  <span className="font-semibold">Total</span>
                  <span className="font-display font-bold text-2xl">£{total.toFixed(2)}</span>
                </div>

                <Button type="submit" size="lg" className="w-full rounded-full font-semibold" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay £${total.toFixed(2)} & get QR label`}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Demo checkout — no real payment is taken.
                </p>
                {isSample && (
                  <p className="text-xs text-center text-accent">
                    This is a demo listing — try it with a <Link to="/sell" className="underline font-semibold">real listing you create</Link> for a saved order.
                  </p>
                )}
              </div>
            </aside>
          </form>
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
