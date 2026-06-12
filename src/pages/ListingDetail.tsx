import { useEffect, useMemo, useState } from "react";
import { Img } from "@/components/Img";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, ShieldCheck, Truck, MessageCircle, Tag } from "lucide-react";
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
import { SellerReviews } from "@/components/SellerReviews";
import { ReportDialog } from "@/components/ReportDialog";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useSEO } from "@/hooks/useSEO";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const isDbId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
  /^\d+$/.test(id);

const resolvePhotoUrl = (path: string): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
  return data.publicUrl;
};

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFavourited, toggle: toggleFav } = useFavourites();

  const [listing, setListing] = useState<Listing | null>(null);
  const [postagePence, setPostagePence] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useSEO({
    title: listing ? `${listing.title} · PrelovedKicks` : "PrelovedKicks",
    description: listing?.description ?? undefined,
  });

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
        if (!cancelled) { setListing(sample); setLoading(false); }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: row, error } = await (supabase as any)
        .from("listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !row) { setLoading(false); return; }

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
        arr = s.trim().startsWith("[") ? JSON.parse(s) : [s];
      } else if (listing.image) {
        arr = [listing.image];
      }
    } catch {
      arr = listing.image ? [listing.image] : [];
    }
    return arr.filter(Boolean).map(resolvePhotoUrl);
  }, [listing]);

  const safeActiveImage = Math.min(activeImage, Math.max(images.length - 1, 0));
  const mainImage = images[safeActiveImage] || "";
  const sizeEu = listing ? (listing.sizeEu ?? ukToEu(listing.sizeUk)) : null;
  const isOwnListing = !!(user && listing?.seller.id && user.id === listing.seller.id);
  const isDbListing = listing && isDbId(listing.id);
  const isSample = listing?.isSample === true;

  const handleBuy = () => {
    if (!user) return navigate("/auth");
    if (isOwnListing) return toast.error("You can't buy your own listing");
    navigate(`/checkout/${listing!.id}`);
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleMessageSeller = async () => {
    if (!user) return navigate("/auth");
    if (!listing?.seller.id) return;
    if (isOwnListing) return toast.error("You can't message yourself");
    if (!isDbListing) return toast.info("Sample listings can't be messaged");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("threads")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", user.id)
      .eq("seller_id", listing.seller.id)
      .maybeSingle();

    if (existing) return navigate(`/messages/${existing.id}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error } = await (supabase as any)
      .from("threads")
      .insert({ listing_id: listing.id, buyer_id: user.id, seller_id: listing.seller.id })
      .select("id")
      .single();

    if (error || !created) return toast.error("Couldn't start chat");
    navigate(`/messages/${created.id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8 max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {loading ? (
          <Skeleton className="h-96 w-full rounded-2xl" />
        ) : !listing ? (
          <div className="text-center py-20 text-muted-foreground">Listing not found</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Images */}
            <div>
              <button
                type="button"
                className="aspect-square bg-muted rounded-2xl overflow-hidden w-full cursor-zoom-in"
                onClick={() => mainImage && setLightboxOpen(true)}
                aria-label="View full size image"
              >
                {mainImage && (
                  <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" />
                )}
              </button>
              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveImage(i);
                        setLightboxOpen(true);
                      }}
                      className="shrink-0"
                    >
                      <img
                        src={img}
                        alt=""
                        className={cn(
                          "h-16 w-16 object-cover rounded-xl border-2 transition-all",
                          i === safeActiveImage ? "border-primary" : "border-transparent"
                        )}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{listing.brand}</p>
                  <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mt-0.5">{listing.title}</h1>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={handleFavourite} aria-label="Save">
                    <Heart className={cn("h-5 w-5", liked && "fill-destructive text-destructive")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare} aria-label="Share">
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-display font-bold text-3xl">£{listing.price}</p>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  <span>{postagePence > 0 ? `+ £${(postagePence / 100).toFixed(2)} postage` : "Free postage"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Size</p>
                  <p className="font-semibold mt-0.5">UK {listing.sizeUk} · EU {sizeEu}</p>
                </div>
                <div className="bg-muted rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Condition</p>
                  <p className="font-semibold mt-0.5">{listing.condition}</p>
                </div>
              </div>

              {listing.description && (
                <div>
                  <p className="text-sm font-semibold mb-1">Description</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/60 rounded-xl px-3 py-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>Buyer protection included — full refund if item not as described</span>
              </div>

              {!isOwnListing && !isSample && (
                <div className="space-y-2 pt-1">
                  <Button className="w-full rounded-full font-semibold" size="lg" onClick={handleBuy}>
                    Buy now
                  </Button>
                  {user ? (
                    <MakeOfferDialog
                      listingId={listing.id}
                      sellerId={listing.seller.id}
                      buyerId={user.id}
                      askingPrice={listing.price}
                      listingTitle={listing.title}
                      brand={listing.brand}
                      trigger={
                        <Button variant="outline" className="w-full rounded-full font-semibold" size="lg">
                          <Tag className="h-4 w-4 mr-2" /> Make an offer
                        </Button>
                      }
                    />
                  ) : (
                    <Button variant="outline" className="w-full rounded-full font-semibold" size="lg" onClick={() => navigate("/auth")}>
                      <Tag className="h-4 w-4 mr-2" /> Make an offer
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full rounded-full font-semibold" onClick={handleMessageSeller}>
                    <MessageCircle className="h-4 w-4 mr-2" /> Message seller
                  </Button>
                </div>
              )}

              {isOwnListing && (
                <div className="space-y-2 pt-1">
                  <Button variant="outline" className="w-full rounded-full font-semibold" onClick={() => navigate(`/listing/${listing.id}/edit`)}>
                    Edit listing
                  </Button>
                </div>
              )}

              {isSample && (
                <p className="text-sm text-muted-foreground">
                  This is a sample listing — <Link to="/sell" className="underline font-semibold">create a real listing</Link> to sell.
                </p>
              )}

              {listing.seller?.name && (
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Sold by</p>
                  <p className="text-sm font-semibold">{listing.seller.name}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {listing && !isSample && (
          <div className="mt-10">
            <SellerReviews sellerId={listing.seller.id} />
          </div>
        )}
      </main>

      {listing && !isOwnListing && isDbListing && (
        <div className="container max-w-5xl pb-6">
          <ReportDialog targetId={listing.id} targetType="listing" />
        </div>
      )}

      {lightboxOpen && images.length > 0 && (
        <ImageLightbox
          images={images}
          activeIndex={safeActiveImage}
          onClose={() => setLightboxOpen(false)}
          onChangeIndex={setActiveImage}
          alt={listing?.title}
        />
      )}

      <MobileTabBar />
    </div>
  );
};

export default ListingDetail;
