import { Heart, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Listing } from "@/data/listings";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";

const isDbId = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// 🔥 SAFE NORMALISATION (THIS IS THE REAL FIX)
const extractImages = (input: unknown): string[] => {
  if (!input) return [];

  let arr: any = [];

  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === "string") {
    try {
      // handles stringified arrays
      const parsed = JSON.parse(input);
      arr = Array.isArray(parsed) ? parsed : [input];
    } catch {
      arr = [input];
    }
  }

  return arr
    .map(String)
    .filter((url) => typeof url === "string" && url.length > 10);
};

export const ProductCard = ({ listing }: { listing: Listing }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isFavourited, toggle } = useFavourites();
  const liked = isFavourited(listing.id);

  // 🔥 FINAL IMAGE RESOLUTION (ROBUST)
  const images = extractImages(listing.images);
  const image =
    images[0] ||
    (typeof listing.image === "string" ? listing.image : "");

  const handleHeart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isDbId(listing.id)) {
      toast.info("Sample listings can't be saved");
      return;
    }

    try {
      const next = await toggle(listing.id);
      toast.success(next ? "Saved to favourites" : "Removed from favourites");
    } catch {
      toast.error("Couldn't update favourites");
    }
  };

  return (
    <Link to={`/listing/${listing.id}`} className="block">
      <article className="product-card group cursor-pointer animate-fade-in">

        <div className="relative aspect-square bg-muted overflow-hidden">

          {image ? (
            <Img
              src={image}
              alt={`${listing.brand} ${listing.title}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}

          <button
            onClick={handleHeart}
            className="absolute top-2.5 right-2.5 h-9 w-9 rounded-full bg-background/85 backdrop-blur flex items-center justify-center hover:bg-background transition-colors"
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
