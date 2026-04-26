import { Heart, Star } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Listing } from "@/data/listings";
import { cn } from "@/lib/utils";

export const ProductCard = ({ listing }: { listing: Listing }) => {
  const [liked, setLiked] = useState(false);

  return (
    <Link to={`/listing/${listing.id}`} className="block">
      <article className="product-card group cursor-pointer animate-fade-in">
        <div className="relative aspect-square bg-muted overflow-hidden">
          <img
            src={listing.image}
            alt={`${listing.brand} ${listing.title}`}
            loading="lazy"
            width={768}
            height={768}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setLiked((l) => !l);
            }}
            className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full bg-background/85 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
            aria-label={liked ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={cn(
                "h-[18px] w-[18px] transition-all",
                liked
                  ? "fill-accent stroke-accent animate-heart-pop"
                  : "stroke-foreground"
              )}
            />
          </button>
          <span className="absolute bottom-2.5 left-2.5 rounded-full bg-background/90 backdrop-blur px-2.5 py-1 text-xs font-semibold">
            UK {listing.sizeUk}
          </span>
        </div>

        <div className="p-3 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                {listing.brand}
              </p>
              <h3 className="font-semibold text-sm leading-snug truncate">
                {listing.title}
              </h3>
            </div>
            <p className="font-display font-bold text-base shrink-0">
              £{listing.price}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{listing.condition}</span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-foreground stroke-foreground" />
              {listing.seller.rating.toFixed(1)} · {listing.seller.name}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
};
