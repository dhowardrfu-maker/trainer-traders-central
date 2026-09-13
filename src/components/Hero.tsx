import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatPrice } from "@/data/listings";

interface HeroProps {
  /** Real cheapest active-listing price, for the price-burst badge. Omit or
   * pass null while listings are still loading — the badge just won't render
   * rather than show a stale or made-up number. */
  cheapestPrice?: number | null;
}

export const Hero = ({ cheapestPrice }: HeroProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  return (
    <section className="pk-hero relative overflow-hidden">
      <div className="pk-hero-noise" />
      <div className="container py-10 md:py-16 relative z-10">
        <div className="grid md:grid-cols-[0.9fr_1.1fr] gap-10 items-center">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[#d9f9c8]">
              ✦ Pre-loved · Authentic · Affordable
            </span>
            <h1 className="mt-4 font-display font-black text-4xl md:text-6xl tracking-tight leading-[0.98] text-white text-balance">
              Your next pair,<br />
              <span className="pk-brush-text">already broken in.</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-white/85 max-w-lg">
              The UK marketplace for pre-loved trainers. Buy great kicks, sell your pairs, and keep more money in your pocket.
            </p>

            <form onSubmit={handleSearchSubmit} className="pk-hero-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 8, flex: "none" }}>
                <circle cx="11" cy="11" r="7" stroke="#94a3b8" strokeWidth="2" />
                <path d="M21 21l-4.3-4.3" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search trainers, brands or styles..."
                aria-label="Search trainers"
              />
              <button type="submit" aria-label="Search">→</button>
            </form>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/search")}
                className="pk-btn-lime rounded-full font-extrabold text-sm px-6 py-3"
              >
                Browse Trainers →
              </button>
              <button
                onClick={() => navigate("/sell")}
                className="pk-btn-outline-light rounded-full font-extrabold text-sm px-6 py-3"
              >
                Sell Your Trainers
              </button>
            </div>
          </div>

          {/* Hero image + doodles — desktop only */}
          <div className="hidden md:block relative min-h-[390px]">
            <div className="pk-hero-badge">
              Quality sneakers.<br />Real savings.
            </div>
            <div className="pk-splash pk-splash-one" />
            <div className="pk-splash pk-splash-two" />
            <img
              src="https://jwvybofahjxtldjjjdpo.supabase.co/storage/v1/object/public/public-assets/Website%20Banner-recompressed.webp"
              alt="Pre-loved trainers"
              className="relative z-10 mx-auto object-contain object-center"
              style={{ height: 410, width: "100%", maxWidth: 680, filter: "drop-shadow(0 30px 30px rgba(0,0,0,.28))" }}
            />
            {cheapestPrice != null && (
              <div className="pk-price-burst">
                <span className="lbl">Pairs from</span>
                <span className="amt">{formatPrice(cheapestPrice)}</span>
              </div>
            )}
            <div className="pk-kicks-ghost">KICKS</div>
          </div>
        </div>
      </div>
    </section>
  );
};