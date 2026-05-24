import { useEffect, useMemo, useState } from "react";
import { Img } from "@/components/Img";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, ShieldCheck, Truck, Package, MessageCircle, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { ukToEu } from "@/data/listing-options";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";
import { MakeOfferDialog } from "@/components/MakeOfferDialog";
import { OfferPanel } from "@/components/OfferPanel";
import { SellerReviews } from "@/components/SellerReviews";
import { ReportDialog } from "@/components/ReportDialog";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const isDbId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavourited, toggle: toggleFav } = useFavourites();

  const [listing, setListing] = useState<Listing | null>(null);
  const [postagePence, setPostagePence] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);

  const liked = listing ? isFavourited(listing.id) : false;

  const handleFavourite = async () => {
    if (!listing) return;
    if (!user) { navigate("/auth"); return; }
    if (!isDbId(listing.id)) { toast.info("Sample listings can't be saved"); return; }

    try {
      const next = await toggleFav(listing.id);
      toast.success(next ? "Saved to favourites" : "Removed from favourites");
    } catch {
      toast.error("Couldn't update favourites");
    }
  };

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
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !row) {
        setLoading(false);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .eq("user_id", row.seller_id)
        .maybeSingle();

      setPostagePence(row.postage_pence ?? 0);
      setListing(mapDbListing({ ...row, id: String(row.id), profile: p ?? null }));
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [id]);

  const images = useMemo(() => {
    if (!listing) return [];

    let arr: string[] = [];

    try {
      if (Array.isArray(listing.images)) {
        arr = listing.images;
      } else if (typeof listing.images === "string") {
        const s = listing.images as string;
        if (s.trim().startsWith("[")) {
          arr = JSON.parse(s);
        } else {
          arr = [s];
        }
      } else if (listing.image) {
        arr = [listing.image];
      }
    } catch {
      arr = listing.image ? [listing.image] : [];
    }

    return arr.filter(Boolean);
  }, [listing]);

  const safeActiveImage = Math.min(activeImage, Math.max(images.length - 1, 0));
  const mainImage = images[safeActiveImage] || "";

  const sizeEu = listing ? (listing.sizeEu ?? ukToEu(listing.sizeUk)) : null;
  const isOwnListing = !!(user && listing?.seller.id && user.id === listing.seller.id);

  const handleBuy = () => {
    if (!user) return navigate("/auth");
    if (isOwnListing) return toast.error("You can't buy your own listing");
    navigate(`/checkout/${listing!.id}`);
  };

  const isDbListing = listing && isDbId(listing.id);

  const handleMessageSeller = async () => {
    if (!user) return navigate("/auth");
    if (!listing?.seller.id) return;
    if (isOwnListing) return toast.error("You can't message yourself");
    if (!isDbListing) return toast.info("Sample listings can't be messaged");

    const { data: existing } = await supabase
      .from("threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.seller.id)
      .maybeSingle();

    if (existing) return navigate(`/messages/${existing.id}`);

    const { data: created, error } = await supabase
      .from("threads")
      .insert({
        listing_id: listing.id,
        buyer_id: user.id,
        seller_id: listing.seller.id,
      } as any)
      .select("id")
      .single();

    if (error || !created) return toast.error("Couldn't start chat");

    navigate(`/messages/${(created as any).id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />

      <main className="container py-4 md:py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : !listing ? (
          <div className="text-center py-20">Listing not found</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">

            {/* IMAGE */}
            <div>
              <div className="aspect-square bg-muted rounded-xl overflow-hidden">
                {mainImage && (
                  <Img src={mainImage} className="w-full h-full object-cover" />
                )}
              </div>

              <div className="flex gap-2 mt-3 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)}>
                    <img
                      src={img}
                      className={cn(
                        "h-16 w-16 object-cover rounded",
                        i === activeImage && "ring-2 ring-primary"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* INFO */}
            <div>
              <h1 className="text-2xl font-bold">{listing.title}</h1>
              <p className="text-3xl mt-2">£{listing.price}</p>

              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>
                  {postagePence > 0
                    ? `+ £${(postagePence / 100).toFixed(2)} postage`
                    : "Free postage"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <Spec label="Size" value={`UK ${listing.sizeUk} · EU ${sizeEu}`} />
                <Spec label="Condition" value={listing.condition} />
              </div>

              <Button className="mt-6 w-full" onClick={handleBuy}>
                Buy now
              </Button>
            </div>
          </div>
        )}
      </main>

      <MobileTabBar />
    </div>
  );
};

const Spec = ({ label, value }: any) => (
  <div className="bg-muted p-2 rounded">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-semibold">{value}</p>
  </div>
);

export default ListingDetail;