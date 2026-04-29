import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type TargetType = "listing" | "message" | "user" | "thread";

const REASONS: Record<TargetType, string[]> = {
  listing: ["Counterfeit / fake", "Misleading description", "Prohibited item", "Spam", "Other"],
  message: ["Harassment", "Scam / fraud", "Inappropriate content", "Spam", "Other"],
  user: ["Scam / fraud", "Harassment", "Underage", "Impersonation", "Other"],
  thread: ["Scam / fraud", "Harassment", "Spam", "Other"],
};

interface Props {
  targetType: TargetType;
  targetId: string;
  trigger?: React.ReactNode;
}

export const ReportDialog = ({ targetType, targetId, trigger }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[targetType][0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!user) { navigate("/auth"); return; }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't submit report");
      return;
    }
    toast.success("Report submitted — thanks for keeping PrelovedKicks safe");
    setOpen(false);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Flag className="h-3.5 w-3.5 mr-1.5" /> Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Report this {targetType}</DialogTitle>
          <DialogDescription>
            Our team reviews every report. False reports may affect your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REASONS[targetType].map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={`r-${r}`} />
                  <Label htmlFor={`r-${r}`} className="font-normal cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Anything else we should know?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
