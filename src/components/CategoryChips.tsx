import { X } from "lucide-react";
import { CATEGORIES } from "@/data/listings";
import { cn } from "@/lib/utils";

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
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-none -mx-1 px-1 items-center">
          {CATEGORIES.map((c) => (
            <button
              key={c.label}
              onClick={() => onChange(c.label)}
              className={cn("chip", active === c.label && "chip-active")}
            >
              {"emoji" in c && c.emoji ? <span>{c.emoji}</span> : null}
              {c.label}
            </button>
          ))}
          {showClear && active !== "All" && (
            <button
              onClick={() => onChange("All")}
              className="chip inline-flex items-center gap-1 text-muted-foreground shrink-0"
            >
              <X className="h-3.5 w-3.5" /> Clear filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
