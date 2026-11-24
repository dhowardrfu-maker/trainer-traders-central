import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Shown next to accounts run by PrelovedKicks itself. Only admin accounts get it,
// so members can tell a genuine message from someone pretending to be us.
export const OfficialBadge = ({ className }: { className?: string }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary align-middle shrink-0",
      className
    )}
    title="This account is run by PrelovedKicks"
  >
    <ShieldCheck className="h-3 w-3" aria-hidden="true" />
    Official
  </span>
);
