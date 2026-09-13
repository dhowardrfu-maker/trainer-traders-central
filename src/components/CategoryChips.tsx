import { X } from "lucide-react";
import { CATEGORIES } from "@/data/listings";
import { cn } from "@/lib/utils";

// Hand-drawn marks for brands with a simple enough silhouette to trace
// cleanly (nominative use — identifying genuine listings, not implying
// endorsement). Brands with more detailed figurative logos (Jordan, Puma)
// fall back to a wordmark rather than an inaccurate trace.
const BrandMark = ({ label }: { label: string }) => {
  switch (label) {
    case "All":
      return <span className="text-xl">👟</span>;
    case "Nike":
      return (
        <svg viewBox="0 0 100 60" fill="currentColor" className="w-6 h-6"><path d="M6 36 C16 42 30 42 46 34 C66 24 82 13 96 7 C80 24 60 40 40 48 C24 54 12 50 6 36 Z"/></svg>
      );
    case "adidas":
    case "adidas Originals":
      return (
        <svg viewBox="0 0 90 60" fill="currentColor" className="w-6 h-6">
          <polygon points="8,52 18,52 42,10 32,10"/><polygon points="24,52 34,52 58,10 48,10"/><polygon points="40,52 50,52 74,10 64,10"/>
        </svg>
      );
    case "Asics":
      return (
        <svg viewBox="0 0 90 60" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" className="w-6 h-6"><path d="M8 52C24 36 30 20 26 6"/><path d="M28 52C44 36 50 20 46 6"/><path d="M48 52C64 36 70 20 66 6"/></svg>
      );
    case "Converse":
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 1l2.7 7.6H23l-6.5 4.7L19 21l-7-5.1L5 21l2.5-7.7L1 8.6h8.3z"/></svg>
      );
    case "Reebok":
      return (
        <svg viewBox="0 0 60 60" fill="currentColor" className="w-5 h-5"><path d="M30 4 8 46h13l9-18 9 18h13z"/><path d="M30 22 19 46h9l2-4 2 4h9z" opacity="0.45"/></svg>
      );
    case "New Balance":
      return <span className="font-display font-black italic text-lg">N</span>;
    case "Yeezy":
      return <span className="font-display font-black text-[10px] tracking-wide">YEEZY</span>;
    case "Vans":
      return <span className="font-display font-black italic text-sm">VANS</span>;
    case "Jordan":
      return <span className="font-display font-black text-[11px]">Jordan</span>;
    case "Puma":
      return <span className="font-display font-black text-[11px]">PUMA</span>;
    default:
      return <span className="font-display font-black text-[11px]">{label.slice(0, 3)}</span>;
  }
};

export const CategoryChips = ({
  active,
  onChange,
  showClear = false,
}: {
  active: string;
  onChange: (label: string) => void;
  showClear?: boolean;
}) => {
  return (
    <div className="border-b border-border">
      <div className="container">
        <div className="flex gap-3 py-4 overflow-x-auto scrollbar-none -mx-1 px-1 items-start">
          {CATEGORIES.map((c) => {
            const isActive = active === c.label;
            return (
              <button
                key={c.label}
                onClick={() => onChange(c.label)}
                className="flex flex-col items-center gap-1.5 shrink-0 w-[76px]"
              >
                <span
                  className={cn(
                    "pk-brand-chip w-14 h-14 rounded-full flex items-center justify-center transition-shadow",
                    isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                >
                  <BrandMark label={c.label} />
                </span>
                <span className={cn("text-[11px] font-semibold text-center leading-tight", isActive ? "text-primary" : "text-muted-foreground")}>
                  {c.label}
                </span>
              </button>
            );
          })}
          {showClear && active !== "All" && (
            <button
              onClick={() => onChange("All")}
              className="chip inline-flex items-center gap-1 text-muted-foreground shrink-0 mt-3"
            >
              <X className="h-3.5 w-3.5" /> Clear filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
