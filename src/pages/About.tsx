import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const About = () => {
  useSEO({
    title: "About · PrelovedKicks",
    description: "PrelovedKicks is the UK community marketplace for second-hand sneakers. Find, sell, and swap trainers with verified buyers and sellers.",
  });
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Home"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-bold">About</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-2xl flex-1 prose prose-sm dark:prose-invert">
        <h1 className="text-3xl font-extrabold tracking-tight">A home for pre-loved kicks.</h1>
        <p className="text-muted-foreground text-lg mt-3">
          PrelovedKicks is the UK marketplace built for sneakerheads who care about both style and sustainability.
        </p>
        <p className="mt-6">
          Every pair of trainers tells a story. Instead of letting them sit unworn in the back of a wardrobe — or worse,
          end up in landfill — PrelovedKicks gives them a second chance. Buyers find rare and everyday pairs at fair prices.
          Sellers earn back what their kicks are really worth.
        </p>
        <h2 className="text-xl font-bold mt-8">What makes us different</h2>
        <ul className="mt-3 space-y-2">
          <li>🇬🇧 UK-first, with Royal Mail Tracked 48 shipping built in.</li>
          <li>💬 Real-time messaging and negotiable offers between buyers and sellers.</li>
          <li>⭐ Verified reviews — only after a confirmed order.</li>
          <li>🛡️ AI-moderated photos to keep listings safe and on-brand.</li>
        </ul>
      </main>
      <Footer />
    </div>
  );
};

export default About;
