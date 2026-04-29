import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ProductCard } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { SAMPLE_LISTINGS, mapDbListing, type Listing } from "@/data/listings";
import { useSEO } from "@/hooks/useSEO";

const POPULAR = ["Nike", "Jordan", "adidas", "Dunk", "Air Max", "Samba", "New Balance", "Yeezy"];

const matches = (l: Listing, q: string) => {
  const hay = `${l.brand} ${l.title} ${l.color ?? ""} ${l.description ?? ""}`.toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => hay.includes(token));
};

const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = params.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: query ? `“${query}” — PrelovedKicks search` : "Search trainers — PrelovedKicks",
    description: query
      ? `Search results for “${query}” on PrelovedKicks — second-hand trainers from real UK sellers.`
      : "Search thousands of pre-loved trainers from UK sellers on PrelovedKicks.",
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: rows } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, size_eu, condition, gender, color, description, price_pence, photos, created_at, seller_id")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled || !rows) {
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

      setDbListings(rows.map((r) => mapDbListing({ ...r, profile: profiles[r.seller_id] ?? null })));
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (query) setParams({ q: query }, { replace: true });
      else setParams({}, { replace: true });
    }, 200);
    return () => clearTimeout(t);
  }, [query, setParams]);

  const all = useMemo<Listing[]>(() => [...dbListings, ...SAMPLE_LISTINGS], [dbListings]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return all.filter((l) => matches(l, q));
  }, [all, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-4 md:py-8">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 md:hidden"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-1">
          Search
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          Find kicks by brand, model, colour or keyword.
        </p>

        <div className="relative max-w-2xl mb-6">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try ‘Jordan 1’, ‘Samba black’, ‘size 9’…"
            className="pl-10 pr-10 h-12 rounded-full bg-muted border-transparent focus-visible:bg-background"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-background"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!hasQuery && (
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">
              Popular searches
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR.map((term) => (
                <Button
                  key={term}
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setQuery(term)}
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        )}

        {hasQuery && (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {loading
                ? "Searching…"
                : `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”`}
            </p>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-xl" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="py-16 text-center">
                <p className="font-semibold">No matches</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Try a different brand, model or spelling.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                {results.map((l) => (
                  <ProductCard key={l.id} listing={l} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
};

export default SearchPage;
