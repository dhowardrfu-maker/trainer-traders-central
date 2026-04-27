import { Heart, Home, Plus, MessageCircle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const MobileTabBar = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const requireAuth = (path: string) => {
    if (!user) navigate("/auth");
    else navigate(path);
  };

  const items = [
    { icon: Home, label: "Home", onClick: () => navigate("/") },
    { icon: Heart, label: "Saved", onClick: () => requireAuth("/profile?tab=saved") },
    { icon: Plus, label: "Sell", primary: true, onClick: () => requireAuth("/sell") },
    { icon: MessageCircle, label: "Inbox", onClick: () => requireAuth("/profile?tab=orders") },
    { icon: User, label: "Profile", onClick: () => requireAuth("/profile") },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-5 h-16">
        {items.map((it) => (
          <li key={it.label} className="flex items-center justify-center">
            <button
              onClick={it.onClick}
              className={
                it.primary
                  ? "h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card -mt-4"
                  : "flex flex-col items-center gap-0.5 text-muted-foreground"
              }
              aria-label={it.label}
            >
              <it.icon className={it.primary ? "h-5 w-5" : "h-[22px] w-[22px]"} />
              {!it.primary && <span className="text-[10px] font-medium">{it.label}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
