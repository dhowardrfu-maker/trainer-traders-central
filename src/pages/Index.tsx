import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ScanLine, Truck, ShieldCheck, MessageCircle, Check, Smartphone } from "lucide-react";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";
import { CategoryChips } from "@/components/CategoryChips";
import { ProductCard } from "@/components/ProductCard";
import { Img } from "@/components/Img";
import { TrainerOfTheWeek } from "@/components/TrainerOfTheWeek";
import { ReviewsShowcase } from "@/components/ReviewsShowcase";
import { MobileTabBar } from "@/components/MobileTabBar";
import Footer from "@/components/Footer";
import { mapDbListing, type Listing } from "@/data/listings";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";

const BANNER_IMG = "https://jwvybofahjxtldjjjdpo.supabase.co/storage/v1/object/public/public-assets/Website%20Banner-recompressed.webp";
const wallCrop = (x: number, y: number): React.CSSProperties => ({
  backgroundImage: `url(${BANNER_IMG})`,
  backgroundRepeat: "no-repeat",
  backgroundColor: "#fff",
  backgroundSize: "3072px 2048px",
  backgroundPosition: `${x}px ${y}px`,
  WebkitMaskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 58%, transparent 88%)",
  maskImage: "radial-gradient(ellipse 60% 60% at 50% 50%, #000 58%, transparent 88%)",
  filter: "contrast(1.15) saturate(1.2) brightness(1.02)",
});

// Matches ProductCard's own normalisation — `listing.image` can be the raw
// stringified photos array rather than a resolved path, so the first real
// photo has to be pulled out the same way everywhere it's displayed.
const firstPhoto = (l: Listing): string => {
  const raw = l.images;
  let arr: unknown[] = [];
  if (Array.isArray(raw)) arr = raw;
  else if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      arr = Array.isArray(parsed) ? parsed : [raw];
    } catch {
      arr = [raw];
    }
  }
  const clean = arr.map(String).filter((url) => url.length > 10);
  return clean[0] || (typeof l.image === "string" && l.image.length > 10 ? l.image : "");
};

const LISTING_COLUMNS =
  "id, title, brand, model, size_uk, size_eu, condition, gender, color, description, price_pence, promotion_active, promotion_percent, retail_price_pence, tag_verified, photos, created_at, seller_id";

const Index = () => {
  const navigate = useNavigate();
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Shared helper: resolves seller profiles for a batch of rows and maps
  // them into Listing objects. Used by both the active-listings load and
  // the sold-listings load below, so the two queries stay consistent.
  const mapRowsWithProfiles = async (rows: any[]): Promise<Listing[]> => {
    const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
    let profiles: Record<string, { username: string | null; display_name: string | null }> = {};

    if (sellerIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles_public")
        .select("user_id, username, display_name")
        .in("user_id", sellerIds);

      if (profileRows) {
        profiles = Object.fromEntries(
          profileRows.map((p) => [
            p.user_id,
            { username: p.username, display_name: p.display_name },
          ])
        );
      }
    }

    return rows.map((r) => {
      const photos =
        Array.isArray(r.photos)
          ? r.photos
          : typeof r.photos === "string"
            ? [r.photos]
            : [];

      const cleanPhotos = photos.filter(Boolean);

      const listing = mapDbListing({
        ...r,
        id: String(r.id),
        photos: cleanPhotos.length ? cleanPhotos : ["/placeholder.svg"],
        profile: profiles[r.seller_id] ?? null,
      });

      return {
        ...listing,
        image: listing.image || "/placeholder.svg",
      };
    });
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: rows, error } = await supabase
        .from("listings")
        .select(LISTING_COLUMNS)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);

      if (cancelled) return;

      if (error || !rows) {
        console.error(error);
        setLoading(false);
        return;
      }

      setDbListings(await mapRowsWithProfiles(rows));
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const all = useMemo<Listing[]>(
    () => [...dbListings],
    [dbListings]
  );

  const popular = useMemo(() => all.slice(0, 5), [all]);

  const under50 = useMemo(
    () => all.filter((l) => l.price <= 50).slice(0, 8),
    [all]
  );

  const cheapestPrice = useMemo(
    () => (all.length ? Math.min(...all.map((l) => l.price)) : null),
    [all]
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main>
        <Hero cheapestPrice={cheapestPrice} />

        <section className="container pt-6 md:pt-10">
          <div className="flex items-end justify-between mb-4 gap-4">
            <h2 className="pk-section-title">Shop by brand</h2>
            <Link to="/search" className="text-sm font-bold text-slate-500">View all →</Link>
          </div>
        </section>
        <CategoryChips
          active="All"
          onChange={(label) => navigate(label === "All" ? "/search" : `/search?q=${encodeURIComponent(label)}`)}
        />

        {!loading && popular.length > 0 && (
          <section className="container py-6 md:py-10">
            <div className="flex items-end justify-between mb-4 gap-4">
              <div>
                <h2 className="pk-section-title">Popular right now</h2>
                <p className="text-sm text-muted-foreground mt-1">Fresh pairs, proper prices.</p>
              </div>
              <Link to="/search" className="text-sm font-bold text-slate-500 shrink-0">View all →</Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {popular.map((l) => (
                <ProductCard key={l.id} listing={l} />
              ))}
            </div>
          </section>
        )}

        <TrainerOfTheWeek />

        <section className="container py-6 md:py-8">
          <div className="pk-trust-strip grid grid-cols-1 md:grid-cols-4">
            {[
              { icon: ScanLine, title: "Tag Verified", body: "Scan checks the tag against trusted retailers." },
              { icon: Truck, title: "Tracked Shipping", body: "Safe, tracked delivery." },
              { icon: ShieldCheck, title: "Buyer Protection", body: "Shop confidently." },
              { icon: MessageCircle, title: "Real-Time Chat", body: "Message sellers." },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3 px-5 py-4 text-white border-white/10 border-b md:border-b-0 md:border-r last:border-0">
                <f.icon className="ic h-6 w-6 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{f.title}</p>
                  <p className="text-[11px] text-white/65">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {!loading && under50.length > 0 && (
          <section className="container py-2 md:py-4">
            <div className="pk-under50 p-6 md:p-8 flex-col md:flex-row">
              <div className="relative z-10 max-w-[340px]">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#d9f9c8]">Big brands. Small budgets.</p>
                <h2 className="mt-1.5 font-display text-3xl md:text-4xl font-black uppercase leading-none text-white">
                  Under <span className="pk-lime">£50</span>
                </h2>
                <p className="mt-2 text-sm text-white/75">Amazing trainers. Even better prices.</p>
                <button
                  onClick={() => navigate("/search?priceMax=50")}
                  className="mt-4 rounded-full bg-[#cfff23] text-[#0b1a04] font-black text-sm px-5 py-2.5"
                >
                  Shop Under £50 →
                </button>
              </div>
              <div className="pk-under50-shoes">
                {under50.slice(0, 3).map((l) => (
                  <Link key={l.id} to={`/listing/${l.id}`} className="pk-floating-shoe">
                    <Img src={firstPhoto(l)} thumbnail alt={`${l.brand} ${l.title}`} />
                  </Link>
                ))}
              </div>
              <div className="relative z-10 max-w-[180px] text-right font-display text-xl font-black uppercase leading-tight text-[#cfff23]">
                Great kicks.<br />Smaller price tags.
              </div>
            </div>
          </section>
        )}

        <section className="container py-6 md:py-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="pk-action-panel pk-action-lime p-7 md:p-8 min-h-[280px]">
              <div className="pk-panel-splash" />
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">Buy</h2>
              <p className="mt-1 text-sm font-bold opacity-80">Great trainers. Great prices.</p>
              <ul className="mt-4 space-y-2 text-sm font-semibold sm:max-w-[58%]">
                {["Browse listings", "Chat with sellers", "Pay securely", "Get your trainers tracked"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" />{t}</li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/search")}
                className="relative z-10 mt-6 rounded-full bg-slate-950 text-white font-bold text-sm px-6 py-3"
              >
                Start Browsing →
              </button>
              <div
                className="mt-5 mx-auto sm:mx-0 sm:mt-0 sm:absolute sm:right-2 sm:bottom-2 w-[170px] h-[170px] md:w-[220px] md:h-[220px] rounded-2xl shadow-xl"
                style={wallCrop(-1000, -754)}
              />
            </div>
            <div className="pk-action-panel pk-action-purple p-7 md:p-8 min-h-[280px]">
              <div className="pk-panel-splash" />
              <h2 className="font-display text-4xl md:text-5xl font-black tracking-tight">Sell</h2>
              <p className="mt-1 text-sm font-bold opacity-80">Turn your kicks into cash.</p>
              <ul className="mt-4 space-y-2 text-sm font-semibold sm:max-w-[58%]">
                {["List in 60 seconds", "Add photos & details", "Ship with tracking", "Get paid"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0" />{t}</li>
                ))}
              </ul>
              <button
                onClick={() => navigate("/sell")}
                className="relative z-10 mt-6 rounded-full bg-white text-[#6e19e8] font-bold text-sm px-6 py-3"
              >
                Start Selling →
              </button>
              <div
                className="mt-5 mx-auto sm:mx-0 sm:mt-0 sm:absolute sm:right-2 sm:bottom-2 w-[170px] h-[170px] md:w-[220px] md:h-[220px] rounded-2xl shadow-xl"
                style={wallCrop(-166, -442)}
              />
            </div>
          </div>
        </section>

        <ReviewsShowcase />

        <section className="container py-6 md:py-10">
          <div className="pk-app-banner p-7 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#cfff23]">Browse. Chat. Buy. Sell. Anywhere.</p>
              <h2 className="mt-1 font-display text-3xl md:text-4xl font-black uppercase leading-none text-white">
                Get the <span className="pk-lime">app</span>
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Keep your favourite trainers close, chat with sellers and track orders on the go.
              </p>
              <Link
                to="/help#get-the-app"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#cfff23] text-[#0b1a04] font-bold text-sm px-5 py-3"
              >
                <Smartphone className="h-4 w-4" /> How to install
              </Link>
              <div className="mt-6 grid grid-cols-2 gap-2 text-sm text-white/85">
                {["Instant notifications", "Save favourite trainers", "Chat with sellers", "Track your orders"].map((t) => (
                  <div key={t} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#cfff23]" />{t}</div>
                ))}
              </div>
            </div>
            <div className="pk-phone w-[170px] h-[340px] shrink-0 p-2">
              <div className="pk-phone-screen w-full h-full rounded-[22px] overflow-hidden relative p-3">
                <div className="ps-bar"><span>9:41</span><span>●●●</span></div>
                <p className="mt-2 text-[9px] font-black text-white">PrelovedKicks</p>
                <p className="mt-2 font-display font-black text-white text-base leading-tight">
                  Your next pair,<br /><span className="pk-lime">already broken in.</span>
                </p>
                <p className="mt-1 text-[7px] leading-tight text-white/80">
                  Thousands of second-hand trainers from real people.
                </p>
                <div className="ps-search">Search trainers…</div>
                <div className="mt-2 flex gap-1">
                  <span className="rounded-full bg-[#cfff23] text-[#0b1a04] text-[7px] font-black px-2 py-1">Browse →</span>
                  <span className="rounded-full bg-white/15 text-white text-[7px] font-black px-2 py-1">Sell</span>
                </div>
                <div className="ps-brands">
                  {Array.from({ length: 5 }).map((_, i) => <span key={i} />)}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer hideAppBar />
      <MobileTabBar />
    </div>
  );
};

export default Index;