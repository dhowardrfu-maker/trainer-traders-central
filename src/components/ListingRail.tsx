import { ProductCard } from "@/components/ProductCard";
import type { Listing } from "@/data/listings";

interface Props {
  title: string;
  subtitle?: string;
  listings: Listing[];
}

/**
 * Horizontal rail of listings. Renders nothing if the list is empty, so
 * sections like "Today's Best Deals" simply don't appear until there's
 * real data to show (no empty-state placeholders on a live site).
 */
export const ListingRail = ({ title, subtitle, listings }: Props) => {
  if (listings.length === 0) return null;

  return (
    <section className="container py-6 md:py-8">
      <div className="mb-4">
        <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory">
        {listings.map((l) => (
          <div key={l.id} className="w-[46%] sm:w-[30%] md:w-[22%] shrink-0 snap-start">
            <ProductCard listing={l} />
          </div>
        ))}
      </div>
    </section>
  );
};