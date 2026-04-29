import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, MessageCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ThreadRow {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  last_message_at: string;
}

interface DisplayThread extends ThreadRow {
  other_name: string;
  listing_title: string | null;
  listing_photo: string | null;
  last_body: string | null;
}

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [threads, setThreads] = useState<DisplayThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("threads")
        .select("id, buyer_id, seller_id, listing_id, last_message_at")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (cancelled || !rows) { setLoading(false); return; }

      const otherIds = Array.from(new Set(rows.map((r) => r.buyer_id === user.id ? r.seller_id : r.buyer_id)));
      const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));

      const [profilesRes, listingsRes] = await Promise.all([
        otherIds.length
          ? supabase.from("profiles").select("user_id, display_name, username").in("user_id", otherIds)
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase.from("listings").select("id, title, photos").in("id", listingIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const profileMap = Object.fromEntries((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));
      const listingMap = Object.fromEntries((listingsRes.data ?? []).map((l: any) => [l.id, l]));

      // last message per thread
      const { data: msgs } = await supabase
        .from("messages")
        .select("thread_id, body, created_at")
        .in("thread_id", rows.map((r) => r.id))
        .order("created_at", { ascending: false });
      const lastByThread: Record<string, string> = {};
      (msgs ?? []).forEach((m: any) => {
        if (!lastByThread[m.thread_id]) lastByThread[m.thread_id] = m.body;
      });

      const display: DisplayThread[] = rows.map((r) => {
        const otherId = r.buyer_id === user.id ? r.seller_id : r.buyer_id;
        const p = profileMap[otherId];
        const l = listingMap[r.listing_id];
        return {
          ...r,
          other_name: p?.display_name || p?.username || "User",
          listing_title: l?.title ?? null,
          listing_photo: l?.photos?.[0] ?? null,
          last_body: lastByThread[r.id] ?? null,
        };
      });
      if (!cancelled) {
        setThreads(display);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (authLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-3xl">
        <h1 className="font-display font-bold text-3xl md:text-4xl tracking-tight mb-1">Messages</h1>
        <p className="text-sm text-muted-foreground mb-6">Chat with buyers and sellers in realtime.</p>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : threads.length === 0 ? (
          <Card className="p-10 text-center rounded-2xl">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">No conversations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tap "Message seller" on any listing to start chatting.</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {threads.map((t) => (
              <Link key={t.id} to={`/messages/${t.id}`}>
                <Card className="p-3 rounded-2xl flex items-center gap-3 hover:bg-muted/40 transition-colors">
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-primary-soft text-primary font-semibold">
                      {t.other_name[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{t.other_name}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(t.last_message_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {t.listing_title && (
                      <p className="text-xs text-muted-foreground truncate">re: {t.listing_title}</p>
                    )}
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {t.last_body ?? "Tap to open conversation"}
                    </p>
                  </div>
                  {t.listing_photo && (
                    <img src={t.listing_photo} alt="" className="h-12 w-12 rounded-lg object-cover bg-muted shrink-0" />
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Messages;
