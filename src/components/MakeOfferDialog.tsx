import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  trigger: React.ReactNode;
  onSubmitted?: () => void;
}

export const MakeOfferDialog = ({ listingId, sellerId, buyerId, askingPrice, trigger, onSubmitted }: Props) => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(Math.max(1, Math.round(askingPrice * 0.9)).toString());
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.error("Enter a valid offer");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("offers").insert({
      listing_id: listingId,
      seller_id: sellerId,
      buyer_id: buyerId,
      amount_pence: Math.round(num * 100),
      message: message.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Offer sent");
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
            <Input id="amount" type="number" min={1} step={1} value={amount}
              onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea id="message" rows={3} maxLength={300} placeholder="Add a friendly note…"
              value={message} onChange={(e) => setMessage(e.target.value)} />
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
