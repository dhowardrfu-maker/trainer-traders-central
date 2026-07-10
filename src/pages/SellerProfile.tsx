import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductCard } from "@/components/ProductCard";
import { SellerReviews } from "@/components/SellerReviews";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { mapDbListing, type Listing } from "@/data/listings";
import { useSEO } from "@/hooks/useSEO";

interface PublicProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
}

const LISTING_COLUMNS =
  "id, title, brand, model, size_uk, size_eu, condition, gender, color, description, price_pence, promotion_active, promotion_percent, retail_price_pence, photos, created_at, seller_id";

const SellerProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: profile
      ? `${profile.display_name ?? profile.username ?? "Seller"} · PrelovedKicks`
      : "Seller · PrelovedKicks",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);

      // Only ever select the safe, intentionally-public fields here —
      // never full_name/address/phone/stripe_connect_* even though the
      // current RLS policy technically permits reading them.
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, bio, location, avatar_url")
        .eq("user_id", id)
        .maybeSingle();

      if (cancelled) return;
      if (!prof) {
        setLoading(false);
        return;
      }
      setProfile(prof);

      const { data: rows } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("seller_id", id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (!cancelled && rows) {
        const mapped = rows.map((r) => {
          const photos =
            Array.isArray(r.photos) ? r.photos :
            typeof r.photos === "string" ? [r.photos] : [];
          const cleanPhotos = photos.filter(Boolean);
          const listing = mapDbListing({
            ...r,
            id: String(r.id),
            photos: cleanPhotos.length ? cleanPhotos : ["/placeholder.svg"],
            profile: prof,
          });
          return { ...listing, image: listing.image || "/placeholder.svg" };
        });
        setListings(mapped);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const displayName = profile?.display_name || profile?.username || "Seller";

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8 max-w-3xl">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {loading ? (
          <Skeleton className="h-40 w-full rounded-2xl" />
        ) : !profile ? (
          <div className="text-center py-20 text-muted-foreground">Seller not found</div>
        ) : (
          <>
            <div className="flex items-start gap-4 mb-6">
              <div className="h-20 w-20 rounded-full bg-muted overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-2xl tracking-tight">{displayName}</h1>
                {profile.location && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="h-3.5 w-3.5" /> {profile.location}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{profile.bio}</p>
                )}
              </div>
            </div>

            <SellerReviews sellerId={id!} />

            <div className="mt-8">
              <h2 className="font-display font-bold text-xl mb-4">
                {listings.length > 0 ? `${listings.length} listing${listings.length === 1 ? "" : "s"}` : "No active listings"}
              </h2>
              {listings.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
                  {listings.map((l) => (
                    <ProductCard key={l.id} listing={l} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
};

export default SellerProfile;