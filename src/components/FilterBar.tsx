import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, X } from "lucide-react";
import { CONDITIONS, GENDERS, UK_SIZES } from "@/data/listing-options";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface Filters {
  sizes: number[];
  conditions: string[];
  genders: string[];
  priceMax: number;
}

export const DEFAULT_FILTERS: Filters = {
  sizes: [],
  conditions: [],
  genders: [],
  priceMax: 500,
};

export type SortKey = "newest" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export const FilterBar = ({
  filters,
  onChange,
  sort,
  onSortChange,
  count,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  count: number;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Filters>(filters);

  useEffect(() => { if (open) setDraft(filters); }, [open, filters]);

  const activeCount =
    filters.sizes.length +
    filters.conditions.length +
    filters.genders.length +
    (filters.priceMax < DEFAULT_FILTERS.priceMax ? 1 : 0);

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const apply = () => { onChange(draft); setOpen(false); };
  const reset = () => setDraft(DEFAULT_FILTERS);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 rounded-full">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5 rounded-full">{activeCount}</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl">Filters</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-5 space-y-7">
            <section>
              <Label className="text-sm font-semibold">Size (UK)</Label>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {UK_SIZES.map((s) => {
                  const active = draft.sizes.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => setDraft({ ...draft, sizes: toggle(draft.sizes, s) })}
                      className={cn(
                        "h-9 min-w-11 px-2 rounded-lg border text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-foreground"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <Label className="text-sm font-semibold">Condition</Label>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CONDITIONS.map((c) => {
                  const active = draft.conditions.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      onClick={() => setDraft({ ...draft, conditions: toggle(draft.conditions, c.value) })}
                      className={cn(
                        "h-9 px-3 rounded-full border text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <Label className="text-sm font-semibold">Gender</Label>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {GENDERS.map((g) => {
                  const active = draft.genders.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      onClick={() => setDraft({ ...draft, genders: toggle(draft.genders, g.value) })}
                      className={cn(
                        "h-9 px-3 rounded-full border text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-foreground"
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Max price</Label>
                <span className="font-display font-bold">£{draft.priceMax}{draft.priceMax >= 500 && "+"}</span>
              </div>
              <Slider
                className="mt-3"
                min={20}
                max={500}
                step={5}
                value={[draft.priceMax]}
                onValueChange={([v]) => setDraft({ ...draft, priceMax: v })}
              />
            </section>
          </div>

          <SheetFooter className="flex-row gap-2 sm:flex-row border-t border-border pt-4">
            <Button variant="outline" onClick={reset} className="flex-1">Reset</Button>
            <Button onClick={apply} className="flex-1">Show {count} results</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sort pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSortChange(opt.value)}
            className={cn(
              "h-8 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              sort === opt.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {activeCount > 0 && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="ml-auto text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
};
