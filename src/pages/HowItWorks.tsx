import { Link } from "react-router-dom";
import { ArrowLeft, Camera, MessageCircle, Package, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const steps = [
  { icon: Camera, title: "List in minutes", body: "Snap a few photos, set your price, and post your trainers. Our AI checks photos automatically." },
  { icon: MessageCircle, title: "Chat & negotiate", body: "Buyers can message you in real time and send offers. Accept, reject, or counter — it's up to you." },
  { icon: Package, title: "Ship safely", body: "Choose Royal Mail, InPost or Evri at checkout. Drop off and we'll keep both sides updated." },
  { icon: Star, title: "Earn your reputation", body: "Once an order is confirmed, the buyer can leave a verified review on your profile." },
];

const HowItWorks = () => {
  useSEO({ title: "How it works · PrelovedKicks", description: "How to buy and sell second-hand trainers safely on PrelovedKicks." });
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Home"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-bold">How it works</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-2xl flex-1">
        <h1 className="text-3xl font-extrabold tracking-tight">From listing to laces in 4 steps.</h1>
        <div className="mt-8 space-y-4">
          {steps.map((s, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-2xl border bg-card">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">{i + 1}. {s.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex gap-3">
          <Button asChild className="rounded-full font-semibold"><Link to="/sell">Start selling</Link></Button>
          <Button asChild variant="outline" className="rounded-full font-semibold"><Link to="/search">Browse trainers</Link></Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
