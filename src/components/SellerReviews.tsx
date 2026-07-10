import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  buyer_id: string;
  buyer_name?: string;
}

export const SellerReviews = ({ sellerId }: { sellerId: string }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, buyer_id")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (cancelled || !data) { setLoading(false); return; }
      const buyerIds = Array.from(new Set(data.map((r) => r.buyer_id)));
      let nameMap: Record<string, string> = {};
      if (buyerIds.length) {
        const { data: profs } = await supabase
          .from("profiles").select("user_id, display_name, username").in("user_id", buyerIds);
        nameMap = Object.fromEntries((profs ?? []).map((p: any) => [p.user_id, p.display_name || p.username || "User"]));
      }
      setReviews(data.map((r) => ({ ...r, buyer_name: nameMap[r.buyer_id] ?? "User" })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [sellerId]);

  if (loading) return null;

  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <Card className="p-4 rounded-2xl mt-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold">Seller reviews</h3>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          {reviews.length > 0 && (
            <>
              <Star className="h-3.5 w-3.5 fill-foreground stroke-foreground" />
              <span className="font-semibold text-foreground">{avg.toFixed(1)}</span> ·{" "}
            </>
          )}
          {reviews.length} review{reviews.length === 1 ? "" : "s"}
        </p>
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold">{r.buyer_name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-foreground stroke-foreground" : "stroke-muted-foreground"}`} />
                  ))}
                </span>
                <span className="text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {r.comment && <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};