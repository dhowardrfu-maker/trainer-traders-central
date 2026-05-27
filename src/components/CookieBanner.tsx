import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

const COOKIE_KEY = "plk_cookie_consent";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(COOKIE_KEY);
      if (!consent) setVisible(true);
    } catch {
      // localStorage not available
    }
  }, []);

  const handleAccept = () => {
    try { localStorage.setItem(COOKIE_KEY, "accepted"); } catch {}
    setVisible(false);
  };

  const handleDecline = () => {
    try { localStorage.setItem(COOKIE_KEY, "declined"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cookie className="h-4 w-4 text-primary shrink-0" />
          <p className="font-semibold text-sm">We use cookies</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          We use essential cookies to keep you signed in and non-essential cookies to improve your experience. See our{" "}
          <Link to="/privacy" className="underline text-primary hover:text-primary/80" onClick={handleDecline}>
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="rounded-full flex-1 font-semibold"
            onClick={handleAccept}
          >
            Accept all
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-full flex-1 font-semibold"
            onClick={handleDecline}
          >
            Essential only
          </Button>
        </div>
      </div>
    </div>
  );
};