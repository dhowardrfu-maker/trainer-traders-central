import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // 1) Get active listings
      const { data: rows, error } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, condition, price_pence, photos, created_at, seller_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled) return;
      if (error || !rows) {
        setLoading(false);
        return;
      }

      // 2) Fetch profile usernames separately (RLS-friendly)
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

  const all = useMemo<Listing[]>(() => {
    // Show real listings first, then samples to populate the feed
    return [...dbListings, ...SAMPLE_LISTINGS];
  }, [dbListings]);

  const filtered = useMemo(() => {
    if (activeCategory === "All") return all;
    return all.filter(
      (l) => l.brand.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [all, activeCategory]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main>
        <Hero />
        <CategoryChips active={activeCategory} onChange={setActiveCategory} />

        <section className="container py-6 md:py-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
                Newly listed
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading…" : `${filtered.length} pair${filtered.length === 1 ? "" : "s"} of fresh kicks`}
              </p>
            </div>
            {dbListings.length === 0 && !loading && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Showing examples — be the first to list 👇
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No listings yet for {activeCategory}.
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
