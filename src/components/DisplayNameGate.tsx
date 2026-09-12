import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Routes a signed-in user can still reach even if they haven't chosen a
// display name yet — avoids redirect loops and lets a user sign out from
// the wizard if they need to.
const EXEMPT_PATHS = new Set(["/complete-profile", "/auth"]);

/**
 * Sends a user who hasn't chosen their own display name yet (still on the
 * signup trigger's auto-generated fallback) to /complete-profile. Checked
 * once per login, not on every navigation — once cleared for a session,
 * there's no need to keep re-querying as the user browses.
 */
export const DisplayNameGate = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const checkedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (checkedForUserId.current === user.id) return;
    if (EXEMPT_PATHS.has(location.pathname)) return;

    checkedForUserId.current = user.id;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_chosen_display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && data.has_chosen_display_name === false) {
        navigate("/complete-profile", { replace: true });
      }
    })();
  }, [user, loading, location.pathname, navigate]);

  return null;
};
