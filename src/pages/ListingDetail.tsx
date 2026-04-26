import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, ShieldCheck, Truck, Package } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { ukToEu } from "@/data/listing-options";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setLoading(true);

      // Sample listings (ids start with "s")
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

      let profile: { username: string | null; display_name: string | null } | null = null;
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .eq("user_id", row.seller_id)
        .maybeSingle();
      if (p) profile = { username: p.username, display_name: p.display_name };

      setListing(mapDbListing({ ...row, profile }));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [id]);

  const images = useMemo(() => {
    if (!listing) return [];
    const arr = listing.images && listing.images.length > 0 ? listing.images : [listing.image];
    return arr.filter(Boolean);
  }, [listing]);

  const sizeEu = listing ? (listing.sizeEu ?? ukToEu(listing.sizeUk)) : null;
  const isOwnListing = !!(user && listing?.seller.id && user.id === listing.seller.id);

  const handleBuy = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (isOwnListing) {
      toast.error("You can't buy your own listing");
      return;
    }
    navigate(`/checkout/${listing!.id}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing?.title ?? "PrelovedKicks", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        ) : !listing ? (
          <div className="py-24 text-center">
            <p className="text-lg font-semibold">Listing not found</p>
            <p className="text-muted-foreground mt-1">It may have been sold or removed.</p>
            <Button asChild className="mt-6"><Link to="/">Back to feed</Link></Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            {/* Gallery */}
            <div>
              <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
                <img
                  src={images[activeImage]}
                  alt={`${listing.brand} ${listing.title}`}
                  className="h-full w-full object-cover"
                />
              </div>
              {images.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto scrollbar-none">
                  {images.map((src, i) => (
                    <button
                      key={src + i}
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        "h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors",
                        i === activeImage ? "border-primary" : "border-transparent"
                      )}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                {listing.brand}
              </p>
              <h1 className="font-display font-bold text-2xl md:text-3xl mt-1 leading-tight">
                {listing.title}
              </h1>
              <p className="font-display font-bold text-3xl mt-3">£{listing.price}</p>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <Spec label="Size" value={`UK ${listing.sizeUk} · EU ${sizeEu}`} />
                <Spec label="Condition" value={listing.condition} />
                <Spec label="Gender" value={(listing.gender ?? "unisex").replace(/^./, (c) => c.toUpperCase())} />
                {listing.color && <Spec label="Colour" value={listing.color} />}
              </div>

              {listing.description && (
                <div className="mt-6">
                  <h2 className="font-semibold mb-2">Description</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                    {listing.description}
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-xl border border-border p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm">
                  {listing.seller.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{listing.seller.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 fill-foreground stroke-foreground" />
                    {listing.seller.rating.toFixed(1)} · Posted {listing.postedAgo} ago
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2.5 text-sm">
                <Perk icon={ShieldCheck} text="Buyer protection on every order" />
                <Perk icon={Truck} text="Royal Mail, InPost & Evri at checkout" />
                <Perk icon={Package} text="QR code label generated instantly" />
              </div>

              {/* Desktop CTAs */}
              <div className="hidden md:flex gap-2 mt-6">
                <Button onClick={handleBuy} size="lg" className="flex-1">
                  Buy now · £{listing.price}
                </Button>
                <Button variant="outline" size="lg" onClick={() => setLiked((l) => !l)} aria-label="Favourite">
                  <Heart className={cn("h-5 w-5", liked && "fill-accent stroke-accent")} />
                </Button>
                <Button variant="outline" size="lg" onClick={handleShare} aria-label="Share">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky mobile CTA */}
      {listing && (
        <div className="md:hidden fixed bottom-16 inset-x-0 bg-background/95 backdrop-blur border-t border-border p-3 flex gap-2 z-40">
          <Button variant="outline" size="lg" onClick={() => setLiked((l) => !l)} aria-label="Favourite">
            <Heart className={cn("h-5 w-5", liked && "fill-accent stroke-accent")} />
          </Button>
          <Button onClick={handleBuy} size="lg" className="flex-1">
            Buy · £{listing.price}
          </Button>
        </div>
      )}

      <MobileTabBar />
    </div>
  );
};

const Spec = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-muted/50 px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold text-sm mt-0.5">{value}</p>
  </div>
);

const Perk = ({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Icon className="h-4 w-4 text-primary shrink-0" />
    <span>{text}</span>
  </div>
);

export default ListingDetail;
