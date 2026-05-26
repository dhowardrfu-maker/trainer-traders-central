import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-soft">
      <div className="container py-10 md:py-0 md:min-h-[480px] flex items-center">
        <div className="relative z-10 max-w-xl py-0 md:py-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft text-primary px-3 py-1 text-xs font-semibold uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            Buy & sell pre-loved trainers
          </span>
          <h1 className="mt-4 font-display font-bold text-4xl md:text-6xl tracking-tighter leading-[1.05]">
            Your next pair,<br />
            <span className="text-primary">already broken in.</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-lg">
            Thousands of second-hand trainers from real people. List in 60 seconds, ship with Evri — safe, tracked delivery every time.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="rounded-full font-semibold gap-2 h-12 px-6"
              onClick={() => navigate("/sell")}
            >
              <Plus className="h-4 w-4" /> Start selling
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full font-semibold gap-2 h-12 px-6 bg-background"
              onClick={() => navigate("/search")}
            >
              <Search className="h-4 w-4" /> Browse trainers
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-primary font-bold text-sm">✓</span> Authentic only
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-primary font-bold text-sm">✓</span> Tracked Evri shipping
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="text-primary font-bold text-sm">✓</span> Buyer protected
            </div>
          </div>
        </div>

        {/* Hero image — desktop only */}
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[48%] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=900&q=80&auto=format&fit=crop"
            alt="Sneakers"
            className="w-full h-full object-cover object-center"
          />
          {/* Dark fade at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background/60 to-transparent z-10" />
        </div>
      </div>
    </section>
  );
};