import { Link } from "react-router-dom";
import { HOW_IT_WORKS_STEPS } from "@/data/howItWorks";

export const HowItWorksPreview = () => {
  return (
    <section className="container py-6 md:py-10">
      <div className="flex items-end justify-between mb-4 gap-4">
        <h2 className="font-display font-bold text-2xl md:text-3xl tracking-tight">
          How it works
        </h2>
        <Link to="/how-it-works" className="text-sm font-semibold text-primary shrink-0">
          Learn more
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {HOW_IT_WORKS_STEPS.map((s, i) => (
          <div key={i} className="rounded-2xl border bg-card p-4">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <s.icon className="h-4 w-4" />
            </div>
            <p className="font-semibold text-sm">{s.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
