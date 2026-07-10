import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapDbListing, formatPrice, type Listing } from "@/data/listings";
import { Img } from "@/components/Img";

const LISTING_COLUMNS =
  "id, title, brand, model, size_uk, size_eu, condition, gender, color, description, price_pence, promotion_active, promotion_percent, retail_price_pence, photos, created_at, seller_id, status";

/**
 * Manually curated weekly pick, set by updating a row in `site_settings`
 * directly via the Supabase SQL Editor (see migration comment). Renders
 * nothing if no pick is set, or if the picked listing is no longer active
 * (sold/removed) — never shows a broken or stale spotlight.
 */
export const TrainerOfTheWeek = () => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: setting } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "trainer_of_the_week")
        .maybeSingle();

      const listingId = (setting?.value as { listing_id?: number } | null)?.listing_id;
      if (!listingId) {
        setLoading(false);
        return;
      }

      const { data: row } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("id", listingId)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;

      if (!row) {
        setLoading(false);
        return;
      }

      const photos =
        Array.isArray(row.photos) ? row.photos :
        typeof row.photos === "string" ? [row.photos] : [];
      const cleanPhotos = photos.filter(Boolean);

      let profile: { username: string | null; display_name: string | null } | null = null;
      const { data: p } = await supabase
        .from("profiles")
        .select("username, display_name")
        .eq("user_id", row.seller_id)
        .maybeSingle();
      if (p) profile = p;

      setListing(
        mapDbListing({
          ...row,
          id: String(row.id),
          photos: cleanPhotos.length ? cleanPhotos : ["/placeholder.svg"],
          profile,
        })
      );
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !listing) return null;

  const image = listing.images?.[0] || listing.image || "/placeholder.svg";

  return (
    <section className="container py-6 md:py-8">
      <div className="flex items-center gap-1.5 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
          Trainer of the week
        </h2>
      </div>

      <Link
        to={`/listing/${listing.id}`}
        className="block rounded-2xl border overflow-hidden bg-card hover:shadow-md transition-shadow md:flex"
      >
        <div className="aspect-square md:aspect-auto md:w-80 shrink-0 bg-muted">
          <Img
            src={image}
            alt={`${listing.brand} ${listing.title}`}
            thumbnail={false}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-5 md:p-6 flex flex-col justify-center">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {listing.brand}
          </p>
          <h3 className="font-display font-bold text-xl md:text-2xl mt-0.5">
            {listing.title}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            UK {listing.sizeUk} · {listing.condition}
          </p>
          <p className="font-display font-bold text-2xl mt-3">
            {formatPrice(listing.price)}
          </p>
        </div>
      </Link>
    </section>
  );
};