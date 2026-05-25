import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-soft">
      <div className="container py-10 md:py-16">
        <div className="max-w-2xl">
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
            <Button size="lg" className="rounded-full font-semibold gap-2 h-12 px-6">
              <Plus className="h-4 w-4" /> Start selling
            </Button>
            <Button size="lg" variant="outline" className="rounded-full font-semibold gap-2 h-12 px-6 bg-background">
              <Search className="h-4 w-4" /> Browse trainers
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};