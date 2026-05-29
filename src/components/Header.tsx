import { Heart, Search, MessageCircle, Plus, User, LogOut, ShoppingBag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/logo.png";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
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
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const { unreadCount: unreadMessages } = useUnreadMessages();

  useEffect(() => {
    if (!user) { setProfileAvatarUrl(null); return; }
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_url) setProfileAvatarUrl(data.avatar_url);
      });
  }, [user]);

  const handleSell = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("full_name, address_line1, city, postcode, phone")
      .eq("user_id", user.id)
      .maybeSingle();

    const isComplete = !!(data?.full_name && data?.address_line1 && data?.city && data?.postcode && data?.phone);
    if (!isComplete) {
      toast.error("Please complete your profile (name, address & phone) before listing.");
      navigate("/profile?tab=profile");
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
  const avatarUrl = profileAvatarUrl || (user?.user_metadata?.avatar_url as string | undefined);

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
              className="rounded-full hidden sm:inline-flex relative"
              aria-label="Messages"
              onClick={() => navigate("/messages")}
            >
              <MessageCircle className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#2d9b6f] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none shadow-sm">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
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
                    navigate("/");
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