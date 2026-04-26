import { Heart, Search, ShoppingBag, Plus, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Header = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container flex items-center gap-4 h-16">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-hero flex items-center justify-center text-primary-foreground font-display font-bold text-lg">
            T
          </div>
          <span className="font-display font-bold text-xl tracking-tight">trnrs</span>
        </Link>

        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Nike, Jordan, size 9…"
              className="pl-10 h-11 rounded-full bg-muted border-transparent focus-visible:bg-background"
            />
          </div>
        </div>

        <nav className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" className="md:hidden rounded-full" aria-label="Search">
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex" aria-label="Favourites">
            <Heart className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex" aria-label="Bag">
            <ShoppingBag className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account">
            <User className="h-5 w-5" />
          </Button>
          <Button className="rounded-full ml-1 gap-1.5 font-semibold">
            <Plus className="h-4 w-4" /> Sell
          </Button>
        </nav>
      </div>
    </header>
  );
};
