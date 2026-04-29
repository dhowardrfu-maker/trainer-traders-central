import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  orderId: string;
  buyerId: string;
  sellerId: string;
}

export const ReviewForm = ({ orderId, buyerId, sellerId }: Props) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<{ id: string; rating: number; comment: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("order_id", orderId)
        .eq("buyer_id", buyerId)
        .maybeSingle();
      if (data) {
        setExisting(data);
        setRating(data.rating);
        setComment(data.comment ?? "");
      }
    })();
  }, [orderId, buyerId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const payload = { rating, comment: comment.trim() || null };
    const { error } = existing
      ? await supabase.from("reviews").update(payload).eq("id", existing.id)
      : await supabase.from("reviews").insert({ ...payload, order_id: orderId, buyer_id: buyerId, seller_id: sellerId });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(existing ? "Review updated" : "Review posted");
    if (!existing) setExisting({ id: "new", rating, comment: comment.trim() || null });
  };

  return (
    <Card className="p-4 rounded-2xl">
      <h3 className="font-display font-bold mb-2">{existing ? "Update your review" : "Leave a review"}</h3>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star`}>
              <Star className={cn("h-6 w-6 transition-colors", n <= rating ? "fill-foreground stroke-foreground" : "stroke-muted-foreground")} />
            </button>
          ))}
        </div>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={400}
          placeholder="How was the seller? Packaging, communication, accuracy…" />
        <Button type="submit" disabled={busy} className="rounded-full font-semibold">
          {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {existing ? "Update review" : "Post review"}
        </Button>
      </form>
    </Card>
  );
};
