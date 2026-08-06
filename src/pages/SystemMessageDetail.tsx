import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface CampaignMessage {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  data: Record<string, unknown>;
}

const SystemMessageDetail = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState<CampaignMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, created_at, data")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("type", "campaign")
        .maybeSingle();
      if (cancelled) return;
      setMessage(data as CampaignMessage | null);
      setLoading(false);
      if (data) {
        await supabase.from("notifications").update({ read: true }).eq("id", data.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user, id]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const imageUrl = typeof message?.data?.image_url === "string" ? message.data.image_url : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-2xl">
        <button
          onClick={() => navigate("/messages")}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to messages
        </button>

        {!message ? (
          <p className="text-sm text-muted-foreground text-center py-10">Message not found.</p>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden bg-card">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src="/logo.png" alt="PrelovedKicks" />
                <AvatarFallback className="bg-primary-soft text-primary font-semibold">P</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">PrelovedKicks</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(message.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>

            {imageUrl && (
              <img src={imageUrl} alt="" className="w-full max-h-80 object-cover" />
            )}

            <div className="px-5 py-5">
              <h1 className="font-display font-bold text-xl mb-2">{message.title}</h1>
              {message.body && (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{message.body}</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SystemMessageDetail;
