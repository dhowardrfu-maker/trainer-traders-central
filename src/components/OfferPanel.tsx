import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Offer {
  id: string;
  amount_pence: number;
  status: string;
  buyer_id: string;
  seller_id: string;
  message: string | null;
  created_at: string;
  parent_offer_id: string | null;
}

interface Props {
  listingId: string;
  sellerId: string;
  userId: string; // current user
  askingPrice: number;
}

const statusVariant = (s: string) => {
  if (s === "accepted") return "default";
  if (s === "rejected") return "secondary";
  if (s === "countered") return "secondary";
  return "outline";
};

export const OfferPanel = ({ listingId, sellerId, userId, askingPrice }: Props) => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterFor, setCounterFor] = useState<string | null>(null);
  const [counterAmount, setCounterAmount] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const navigate = useNavigate();

  const isSeller = userId === sellerId;

  const load = async () => {
    const { data } = await supabase
      .from("offers")
      .select("id, amount_pence, status, buyer_id, seller_id, message, created_at, parent_offer_id")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false });
    setOffers((data ?? []) as Offer[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [listingId]);

  const update = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.from("offers").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Offer ${status}`);
    void load();
  };

  const sendCounter = async (parent: Offer) => {
    const num = Number(counterAmount);
    if (!Number.isFinite(num) || num <= 0) { toast.error("Enter a valid counter"); return; }
    setBusy(parent.id);
    // mark parent as countered
    await supabase.from("offers").update({ status: "countered" }).eq("id", parent.id);
    // insert seller-driven counter as new offer (buyer = original buyer)
    const { error } = await supabase.from("offers").insert({
      listing_id: listingId,
      buyer_id: parent.buyer_id,
      seller_id: sellerId,
      amount_pence: Math.round(num * 100),
      parent_offer_id: parent.id,
      message: `Counter to £${(parent.amount_pence / 100).toFixed(2)}`,
    });
    setBusy(null);
    setCounterFor(null);
    setCounterAmount("");
    if (error) { toast.error(error.message); return; }
    toast.success("Counter sent");
    void load();
  };

  if (loading) {
    return <div className="py-3 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }

  if (offers.length === 0) return null;

  return (
    <Card className="p-4 rounded-2xl mt-5">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold">Offers</h3>
      </div>
      <ul className="space-y-3">
        {offers.map((o) => {
          const mineToAct = isSeller && o.status === "pending" && o.buyer_id !== userId;
          const buyerCanAcceptCounter = !isSeller && o.status === "pending" && o.seller_id === sellerId && o.buyer_id === userId && o.parent_offer_id;
          return (
            <li key={o.id} className={cn("rounded-xl border border-border p-3", o.status === "accepted" && "border-primary bg-primary-soft/30")}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">£{(o.amount_pence / 100).toFixed(2)}
                    <span className="text-xs text-muted-foreground font-normal ml-1.5">vs £{askingPrice} asking</span>
                  </p>
                  {o.message && <p className="text-xs text-muted-foreground mt-0.5">{o.message}</p>}
                </div>
                <Badge variant={statusVariant(o.status) as any} className="rounded-full text-[10px] uppercase tracking-wide">{o.status}</Badge>
              </div>

              {mineToAct && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="rounded-full" disabled={busy === o.id} onClick={() => update(o.id, "accepted")}>Accept</Button>
                  <Button size="sm" variant="outline" className="rounded-full" disabled={busy === o.id} onClick={() => update(o.id, "rejected")}>Decline</Button>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => { setCounterFor(o.id); setCounterAmount(((o.amount_pence + askingPrice * 100) / 200).toFixed(0)); }}>Counter</Button>
                </div>
              )}

              {counterFor === o.id && (
                <div className="mt-3 flex gap-2 items-center">
                  <Input type="number" min={1} value={counterAmount} onChange={(e) => setCounterAmount(e.target.value)} className="w-32" />
                  <Button size="sm" className="rounded-full" disabled={busy === o.id} onClick={() => sendCounter(o)}>Send counter</Button>
                  <Button size="sm" variant="ghost" onClick={() => setCounterFor(null)}>Cancel</Button>
                </div>
              )}

              {buyerCanAcceptCounter && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="rounded-full" onClick={() => update(o.id, "accepted")}>Accept counter</Button>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => update(o.id, "rejected")}>Decline</Button>
                </div>
              )}

              {o.status === "accepted" && o.buyer_id === userId && (
                <Button size="sm" className="rounded-full mt-3" onClick={() => navigate(`/checkout/${listingId}?offer=${o.id}`)}>
                  Buy at £{(o.amount_pence / 100).toFixed(2)}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
