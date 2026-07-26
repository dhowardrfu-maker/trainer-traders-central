import { TrendingDown, ShieldCheck } from "lucide-react";
import type { DealScore } from "@/lib/dealScore";
import { formatPrice } from "@/data/listings";

interface DealScorePanelProps {
  score: DealScore | null;
  tagVerified?: boolean;
}

export const DealScorePanel = ({ score, tagVerified }: DealScorePanelProps) => {
  if (!score && !tagVerified) return null;

  const retail = score ? score.retailPence / 100 : null;
  const avg = score?.averageUsedPence != null ? score.averageUsedPence / 100 : null;

  return (
    <div className="rounded-2xl border bg-primary-soft/40 p-4 space-y-3">
      {tagVerified && (
        <div className="flex items-center gap-1.5 text-sm font-bold text-teal-700">
          <ShieldCheck className="h-4 w-4" />
          Tag Verified
          <span className="font-normal text-xs text-muted-foreground">
            — style code checked against a trusted retailer
          </span>
        </div>
      )}

      {score && (
        <div>
          <div className="flex items-center gap-1.5 text-sm font-bold text-primary mb-3">
            <TrendingDown className="h-4 w-4" />
            Deal Score
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Retail price</p>
              <p className="font-semibold line-through text-muted-foreground">{formatPrice(retail!)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Below retail</p>
              <p className="font-bold text-primary">{score.percentBelowRetail}%</p>
            </div>

            {avg != null && (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Market average ({score.comparableCount} similar {score.comparableCount === 1 ? "listing" : "listings"})
                  </p>
                  <p className="font-semibold text-muted-foreground">{formatPrice(avg)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Below market average</p>
                  <p className="font-bold text-primary">{score.percentBelowAverage}%</p>
                </div>
              </>
            )}
          </div>

          {avg == null && (
            <p className="text-xs text-muted-foreground mt-3">
              Not enough similar listings yet for a market average — comparison shown is vs. retail price only.
            </p>
          )}
        </div>
      )}
    </div>
  );
};