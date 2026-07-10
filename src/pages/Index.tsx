import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { ListingRail } from "@/components/ListingRail";
import { PopularBrands } from "@/components/PopularBrands";
import { HowItWorksPreview } from "@/components/HowItWorksPreview";
import { ReviewsShowcase } from "@/components/ReviewsShowcase";
import { MobileTabBar } from "@/components/MobileTabBar";
import Footer from "@/components/Footer";
import { FilterBar, DEFAULT_FILTERS, type Filters, type SortKey } from "@/components/FilterBar";
import { mapDbListing, type Listing } from "@/data/listings";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const LISTING_COLUMNS =
  "id, title, brand, model, size_uk, size_eu, condition, gender, color, description, price_pence, promotion_active, promotion_percent, retail_price_pence, photos, created_at, seller_id";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [soldListings, setSoldListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");

  // Shared helper: resolves seller profiles for a batch of rows and maps
  // them into Listing objects. Used by both the active-listings load and
  // the sold-listings load below, so the two queries stay consistent.
  const mapRowsWithProfiles = async (rows: any[]): Promise<Listing[]> => {
    const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
    let profiles: Record<string, { username: string | null; display_name: string | null }> = {};

    if (sellerIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .in("user_id", sellerIds);

      if (profileRows) {
        profiles = Object.fromEntries(
          profileRows.map((p) => [
            p.user_id,
            { username: p.username, display_name: p.display_name },
          ])
        );
      }
    }

    return rows.map((r) => {
      const photos =
        Array.isArray(r.photos)
          ? r.photos
          : typeof r.photos === "string"
            ? [r.photos]
            : [];

      const cleanPhotos = photos.filter(Boolean);

      const listing = mapDbListing({
        ...r,
        id: String(r.id),
        photos: cleanPhotos.length ? cleanPhotos : ["/placeholder.svg"],
        profile: profiles[r.seller_id] ?? null,
      });

      return {
        ...listing,
        image: listing.image || "/placeholder.svg",
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled) return;

      if (error || !rows) {
        console.error(error);
        setLoading(false);
        return;
      }

      setDbListings(await mapRowsWithProfiles(rows));
      setLoading(false);

      // Recently Sold: separate, small, capped query — only fetched once
      // the main load succeeds, so it never blocks the primary homepage
      // render. Sorted by updated_at, which the DB already keeps in sync
      // via trigger whenever create_order() flips status to 'sold'.
      const { data: soldRows } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "sold")
        .order("updated_at", { ascending: false })
        .limit(8);

      if (!cancelled && soldRows && soldRows.length > 0) {
        setSoldListings(await mapRowsWithProfiles(soldRows));
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const all = useMemo<Listing[]>(
    () => [...dbListings],
    [dbListings]
  );

  const filtered = useMemo(() => {
    let list = all;

    if (activeCategory !== "All") {
      list = list.filter(
        (l) => l.brand.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    if (filters.sizes.length > 0) {
      list = list.filter((l) => filters.sizes.includes(l.sizeUk));
    }

    if (filters.conditions.length > 0) {
      list = list.filter((l) =>
        l.conditionRaw
          ? filters.conditions.includes(l.conditionRaw)
          : filters.conditions.includes(
              l.condition.toLowerCase().replace(/ /g, "_")
            )
      );
    }

    if (filters.genders.length > 0) {
      list = list.filter(
        (l) => l.gender && filters.genders.includes(l.gender)
      );
    }

    if (filters.priceMax < DEFAULT_FILTERS.priceMax) {
      list = list.filter((l) => l.price <= filters.priceMax);
    }

    const sorted = [...list];

    if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);

    return sorted;
  }, [all, activeCategory, filters, sort]);

  // Both rails below are derived client-side from `all`, the single list
  // already fetched on mount — no additional Supabase queries.
  const bestDeals = useMemo(
    () =>
      all
        .filter((l) => (l.promotionPercent ?? 0) > 0)
        .sort((a, b) => (b.promotionPercent ?? 0) - (a.promotionPercent ?? 0))
        .slice(0, 8),
    [all]
  );

  const under50 = useMemo(
    () => all.filter((l) => l.price <= 50).slice(0, 8),
    [all]
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main>
        <Hero />

        {!loading && (
          <>
            <ListingRail
              title="Today's best deals"
              subtitle="Biggest markdowns vs. original price, right now."
              listings={bestDeals}
            />
            <ListingRail
              title="Under £50"
              subtitle="Solid pairs, small budget."
              listings={under50}
            />
          </>
        )}

        <CategoryChips active={activeCategory} onChange={setActiveCategory} />

        <section className="container py-6 md:py-10">
          <div className="flex items-end justify-between mb-4 gap-4">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                {activeCategory === "All" ? "Recently listed" : activeCategory}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading
                  ? "Loading…"
                  : `${filtered.length} pair${filtered.length === 1 ? "" : "s"} of fresh kicks`}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              count={filtered.length}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-semibold">No matches</p>
              <p className="text-muted-foreground text-sm mt-1">
                Try clearing some filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {filtered.map((l) => (
                <ProductCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>

        <ListingRail
          title="Recently sold"
          subtitle="Yes, people actually buy here."
          listings={soldListings}
          sold
        />

        <PopularBrands />
        <HowItWorksPreview />
        <ReviewsShowcase />
      </main>

      <Footer />
      <MobileTabBar />
    </div>
  );
};

export default Index;