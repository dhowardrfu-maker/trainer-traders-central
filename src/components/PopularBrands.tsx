import { Link } from "react-router-dom";
import { CATEGORIES } from "@/data/listings";

/**
 * Static browse-by-brand links. No query, no images — just routes into
 * /search?q=Brand, which reuses the search page's existing single fetch.
 */
export const PopularBrands = () => {
  const brands = CATEGORIES.filter((c) => c.label !== "All" && c.label !== "Other");

  return (
    <section className="container py-6 md:py-8">
      <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-4">
        Popular brands
      </h2>
      <div className="flex flex-wrap gap-2.5">
        {brands.map((b) => (
          <Link
            key={b.label}
            to={`/search?q=${encodeURIComponent(b.label)}`}
            className="rounded-full border bg-card px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors"
          >
            {b.label}
          </Link>
        ))}
      </div>
    </section>
  );
};
