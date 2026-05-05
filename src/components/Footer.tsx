import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t mt-12 bg-muted/30">
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
            <li><Link to="/how-it-works" className="hover:underline">How it works</Link></li>
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
