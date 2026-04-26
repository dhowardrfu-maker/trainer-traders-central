import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { MobileTabBar } from "@/components/MobileTabBar";
import { SAMPLE_LISTINGS } from "@/data/listings";

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered = useMemo(() => {
    if (activeCategory === "All") return SAMPLE_LISTINGS;
    return SAMPLE_LISTINGS.filter(
      (l) => l.brand.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [activeCategory]);

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
                {filtered.length} pair{filtered.length === 1 ? "" : "s"} of fresh kicks
              </p>
            </div>
            <button className="text-sm font-semibold text-primary hover:underline hidden sm:inline">
              See all →
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              No listings yet for {activeCategory}. Be the first to post!
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
