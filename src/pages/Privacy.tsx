import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const Privacy = () => {
  useSEO({ title: "Privacy Policy · PrelovedKicks" });
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Home"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-bold">Privacy Policy</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-2xl flex-1 text-sm leading-relaxed space-y-4">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}</p>
        <h2 className="text-lg font-bold mt-6">What we collect</h2>
        <p>We collect the information you provide when registering (email, username, optional avatar, bio and location) and the content of your listings, messages, offers, orders and reviews.</p>
        <h2 className="text-lg font-bold mt-6">How we use it</h2>
        <p>To operate the marketplace: showing listings, processing orders, sending notifications, preventing fraud, and improving the service.</p>
        <h2 className="text-lg font-bold mt-6">Sharing</h2>
        <p>We share shipping details with the relevant carrier when an order is placed. Public profile info, listings and reviews are visible to other users. We never sell your personal data.</p>
        <h2 className="text-lg font-bold mt-6">Storage & security</h2>
        <p>Data is stored securely on our backend infrastructure (within the EU/UK). Access is protected by row-level security and encrypted in transit.</p>
        <h2 className="text-lg font-bold mt-6">Your rights</h2>
        <p>You can request a copy or deletion of your data at any time by emailing <a className="underline" href="mailto:privacy@prelovedkicks.uk">privacy@prelovedkicks.uk</a>. You can also delete your listings and reviews directly from your profile.</p>
        <h2 className="text-lg font-bold mt-6">Cookies</h2>
        <p>We use only essential cookies needed to keep you signed in and remember your preferences.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
