import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FavouritesContextValue {
  ids: Set<string>;
  loading: boolean;
  isFavourited: (listingId: string) => boolean;
  toggle: (listingId: string) => Promise<boolean>; // returns new state (true = favourited)
}

const FavouritesContext = createContext<FavouritesContextValue | undefined>(undefined);

export const FavouritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("favourites")
        .select("listing_id")
        .eq("user_id", user.id);
      if (cancelled) return;
      if (!error && data) {
        setIds(new Set(data.map((r) => r.listing_id)));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const isFavourited = useCallback((listingId: string) => ids.has(listingId), [ids]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!user) return false;
      const currentlyFav = ids.has(listingId);
      // Optimistic
      setIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      if (currentlyFav) {
        const { error } = await supabase
          .from("favourites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) {
          // Revert
          setIds((prev) => new Set(prev).add(listingId));
          throw error;
        }
        return false;
      } else {
        const { error } = await supabase
          .from("favourites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(listingId);
            return next;
          });
          throw error;
        }
        return true;
      }
    },
    [user, ids]
  );

  const value = useMemo(
    () => ({ ids, loading, isFavourited, toggle }),
    [ids, loading, isFavourited, toggle]
  );

  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
};

export const useFavourites = () => {
  const ctx = useContext(FavouritesContext);
  if (!ctx) throw new Error("useFavourites must be used within FavouritesProvider");
  return ctx;
};
