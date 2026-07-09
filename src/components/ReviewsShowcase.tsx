import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ShowcaseReview {
  id: string;
  rating: number;
  comment: string | null;
  buyer_name: string;
}

/**
 * Sitewide review highlights for the homepage. Deliberately text-only
 * (rating, comment, buyer name) — no photo data, so this doesn't touch
 * storage egress at all. One capped query on mount, nothing per-scroll
 * or per-render.
 */
export const ReviewsShowcase = () => {
  const [reviews, setReviews] = useState<ShowcaseReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, buyer_id")
        .gte("rating", 4)
        .not("comment", "is", null)
        .order("created_at", { ascending: false })
        .limit(6);

      if (cancelled || error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      const buyerIds = Array.from(new Set(data.map((r) => r.buyer_id)));
      let nameMap: Record<string, string> = {};
      if (buyerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, username")
          .in("user_id", buyerIds);
        nameMap = Object.fromEntries(
          (profs ?? []).map((p) => [p.user_id, p.display_name || p.username || "Buyer"])
        );
      }

      setReviews(
        data.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          buyer_name: nameMap[r.buyer_id] ?? "Buyer",
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing to show yet (new marketplace, few reviews) — fail quiet, don't
  // show an empty/awkward section.
  if (loading || reviews.length === 0) return null;

  return (
    <section className="container py-6 md:py-10">
      <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-4">
        What buyers are saying
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-4">
        {reviews.map((r) => (
          <div
            key={r.id}
            className="shrink-0 w-[260px] md:w-auto rounded-2xl border bg-card p-4"
          >
            <div className="flex items-center gap-0.5 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={
                    i < r.rating
                      ? "h-3.5 w-3.5 fill-foreground stroke-foreground"
                      : "h-3.5 w-3.5 stroke-muted-foreground"
                  }
                />
              ))}
            </div>
            <p className="text-sm leading-snug line-clamp-3">"{r.comment}"</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">
              — {r.buyer_name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
