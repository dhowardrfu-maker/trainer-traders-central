import { Link } from "react-router-dom";
import { Smartphone } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t mt-12 bg-muted/30">

      {/* Get the App banner */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Get the PrelovedKicks app</p>
              <p className="text-xs text-muted-foreground">Install on your phone for the best experience</p>
            </div>
          </div>
          <Link
            to="/help#get-the-app"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Smartphone className="h-4 w-4" /> How to install
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4">
        <div>
          <p className="font-extrabold text-lg tracking-tight">PrelovedKicks</p>
          <p className="text-sm text-muted-foreground mt-2">
            The UK marketplace for second-hand trainers. Buy, sell, swap.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Marketplace</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/search" className="hover:underline">Browse</Link></li>
            <li><Link to="/sell" className="hover:underline">Sell</Link></li>
            <li><Link to="/profile" className="hover:underline">Your profile</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Company</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:underline">About</Link></li>
            <li><Link to="/help" className="hover:underline">Help Centre</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-3">Legal</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/terms" className="hover:underline">Terms</Link></li>
            <li><Link to="/privacy" className="hover:underline">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container mx-auto px-4 py-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} PrelovedKicks. All rights reserved.</p>
          <p>Made for sneakerheads in the UK 🇬🇧</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;