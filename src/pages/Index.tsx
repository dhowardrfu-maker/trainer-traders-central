import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { MobileTabBar } from "@/components/MobileTabBar";
import { FilterBar, DEFAULT_FILTERS, type Filters, type SortKey } from "@/components/FilterBar";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: rows, error } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, size_eu, condition, gender, color, description, price_pence, photos, created_at, seller_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled) return;
      if (error || !rows) {
        setLoading(false);
        return;
      }

      const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
      let profiles: Record<string, { username: string | null; display_name: string | null }> = {};
      if (sellerIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", sellerIds);
        if (profileRows) {
          profiles = Object.fromEntries(
            profileRows.map((p) => [p.user_id, { username: p.username, display_name: p.display_name }])
          );
        }
      }

      const mapped = rows.map((r) =>
        mapDbListing({ ...r, profile: profiles[r.seller_id] ?? null })
      );
      setDbListings(mapped);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const all = useMemo<Listing[]>(
    () => [...dbListings, ...SAMPLE_LISTINGS],
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
          : filters.conditions.includes(l.condition.toLowerCase().replace(/ /g, "_"))
      );
    }
    if (filters.genders.length > 0) {
      list = list.filter((l) => l.gender && filters.genders.includes(l.gender));
    }
    if (filters.priceMax < DEFAULT_FILTERS.priceMax) {
      list = list.filter((l) => l.price <= filters.priceMax);
    }

    const sorted = [...list];
    if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    // "newest" = preserve incoming order (db rows already newest-first, then samples)

    return sorted;
  }, [all, activeCategory, filters, sort]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main>
        <Hero />
        <CategoryChips active={activeCategory} onChange={setActiveCategory} />

        <section className="container py-6 md:py-10">
          <div className="flex items-end justify-between mb-4 gap-4">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                {activeCategory === "All" ? "Newly listed" : activeCategory}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading…" : `${filtered.length} pair${filtered.length === 1 ? "" : "s"} of fresh kicks`}
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
              <p className="text-muted-foreground text-sm mt-1">Try clearing some filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
              {filtered.map((l) => (
                <ProductCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </section>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Index;
