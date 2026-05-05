import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";

const Terms = () => {
  useSEO({ title: "Terms of Service · PrelovedKicks" });
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button asChild variant="ghost" size="icon"><Link to="/" aria-label="Home"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-bold">Terms of Service</h1>
        </div>
      </header>
      <main className="container mx-auto px-4 py-10 max-w-2xl flex-1 text-sm leading-relaxed space-y-4">
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long" })}</p>
        <h2 className="text-lg font-bold mt-6">1. About PrelovedKicks</h2>
        <p>PrelovedKicks is a peer-to-peer marketplace that connects buyers and sellers of second-hand footwear in the United Kingdom.
        We provide the platform; the contract of sale is between the buyer and seller.</p>
        <h2 className="text-lg font-bold mt-6">2. Eligibility</h2>
        <p>You must be at least 18 years old (or have a parent/guardian's permission) to use PrelovedKicks. You must provide accurate registration information.</p>
        <h2 className="text-lg font-bold mt-6">3. Listings</h2>
        <p>Sellers are responsible for the accuracy of their listings, including authenticity, condition, and photos. Counterfeit, stolen, or unsafe items are strictly prohibited.</p>
        <h2 className="text-lg font-bold mt-6">4. Buyer & seller conduct</h2>
        <p>Be respectful in messages and negotiations. Harassment, spam and off-platform payments are not allowed and may result in account suspension.</p>
        <h2 className="text-lg font-bold mt-6">5. Shipping</h2>
        <p>Sellers ship via the carrier selected at checkout (Royal Mail, InPost, or Evri) within 3 working days of order confirmation, unless otherwise agreed.</p>
        <h2 className="text-lg font-bold mt-6">6. Limitation of liability</h2>
        <p>PrelovedKicks is provided "as is". To the fullest extent permitted by law, we exclude all warranties and are not liable for transactions between users.</p>
        <h2 className="text-lg font-bold mt-6">7. Contact</h2>
        <p>Questions about these terms? Email <a className="underline" href="mailto:hello@prelovedkicks.uk">hello@prelovedkicks.uk</a>.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
