import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  listingId: string;
  sellerId: string;
  buyerId: string;
  askingPrice: number;
  listingTitle?: string;
  brand?: string;
  trigger: React.ReactNode;
  onSubmitted?: () => void;
}

export const MakeOfferDialog = ({ listingId, sellerId, buyerId, askingPrice, listingTitle, brand, trigger, onSubmitted }: Props) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(Math.max(1, Math.round(askingPrice * 0.9)).toString());
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid offer amount");
      return;
    }
    if (num >= askingPrice) {
      toast.error("Offer must be less than the asking price");
      return;
    }
    setBusy(true);

    const { data: offerData, error } = await supabase.from("offers").insert({
      listing_id: Number(listingId),
      seller_id: sellerId,
      buyer_id: buyerId,
      amount_pence: Math.round(num * 100),
    }).select("id").single();

    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }

    // Bell notification to seller
    await supabase.from("notifications").insert({
      user_id: sellerId,
      type: "offer_received",
      title: "You have a new offer!",
      body: `Someone offered £${num.toFixed(2)} on your listing. Tap to accept or decline.`,
      link: "/profile?tab=offers",
      read: false,
    });

    // Email notification — fire and forget. send-email now looks up the
    // recipient, names, and amounts itself from the offer row (validating
    // the caller is actually that offer's buyer), rather than trusting
    // any of that from the client.
    if (offerData?.id) {
      supabase.functions.invoke("send-email", {
        body: { type: "offer_received", offer_id: offerData.id },
      }).catch((err) => console.error("offer_received email failed:", err));
    }

    setBusy(false);
    toast.success("Offer sent!");
    setOpen(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Make an offer</DialogTitle>
          <DialogDescription>Asking £{askingPrice}. Sellers usually respond within 24h.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Your offer (£)</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={busy} className="rounded-full font-semibold">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send offer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
