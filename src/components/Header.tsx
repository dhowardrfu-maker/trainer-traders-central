import { Heart, Search, MessageCircle, Plus, User, LogOut, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { NotificationsBell } from "@/components/NotificationsBell";
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
    navigate("/sell");
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("q") as HTMLInputElement | null;
    const q = (input?.value ?? "").trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  };

  const initial = user?.email?.[0]?.toUpperCase() ?? "U";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container flex items-center gap-4 h-16">
        <Link to="/" className="flex items-center shrink-0" aria-label="PrelovedKicks home">
          <img
            src={logo}
            alt="PrelovedKicks"
            className="h-11 md:h-12 w-auto object-contain"
            loading="eager"
            decoding="async"
          />
        </Link>

        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Search Nike, Jordan, size 9…"
              className="pl-10 h-11 rounded-full bg-muted border-transparent focus-visible:bg-background"
            />
          </div>
        </form>

        <nav className="flex items-center gap-1 ml-auto">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            aria-label="Search"
            onClick={() => navigate("/search")}
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hidden sm:inline-flex"
            aria-label="Favourites"
            onClick={() => (user ? navigate("/profile?tab=saved") : navigate("/auth"))}
          >
            <Heart className="h-5 w-5" />
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hidden sm:inline-flex"
              aria-label="Messages"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          )}
          {user && <NotificationsBell />}

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
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile?tab=listings")}>
                  <ShoppingBag className="h-4 w-4 mr-2" /> My listings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile?tab=orders")}>
                  <Heart className="h-4 w-4 mr-2" /> Orders
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
