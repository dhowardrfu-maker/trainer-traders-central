import { useState } from "react";
import { CATEGORIES } from "@/data/listings";
import { cn } from "@/lib/utils";

export const CategoryChips = ({
  active,
  onChange,
}: {
  active: string;
  onChange: (label: string) => void;
}) => {
  return (
    <div className="border-b border-border">
      <div className="container">
        <div className="flex gap-2 py-3 overflow-x-auto scrollbar-none -mx-1 px-1">
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
        </div>
      </div>
    </div>
  );
};
