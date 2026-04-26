import { Heart, Search, ShoppingBag, Plus, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSell = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    toast.info("Listing flow coming next 🚧");
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

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

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full ml-1 outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Account">
                  <Avatar className="h-9 w-9 border border-border">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                    <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="font-semibold truncate">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast.info("Profile page coming soon")}>
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("My listings coming soon")}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> My listings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.info("Favourites coming soon")}>
                  <Heart className="h-4 w-4 mr-2" /> Favourites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    toast.success("Signed out");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              className="rounded-full font-semibold"
              onClick={() => navigate("/auth")}
            >
              Sign in
            </Button>
          )}

          <Button className="rounded-full ml-1 gap-1.5 font-semibold" onClick={handleSell}>
            <Plus className="h-4 w-4" /> Sell
          </Button>
        </nav>
      </div>
    </header>
  );
};
