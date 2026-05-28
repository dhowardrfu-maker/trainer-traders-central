import { useEffect, useRef, useState } from "react";
import { Img } from "@/components/Img";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ReportDialog } from "@/components/ReportDialog";

interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface ThreadInfo {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string | number;
  other_name: string;
  listing_title: string | null;
  listing_photo: string | null;
}

const parsePhotos = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return [raw]; }
  }
  return [];
};

const MessageThread = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ThreadInfo | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth", { replace: true }); }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    (async () => {
      const { data: t } = await supabase
        .from("threads")
        .select("id, buyer_id, seller_id, listing_id")
        .eq("id", id)
        .maybeSingle();
      if (cancelled || !t) { setLoading(false); return; }

      const otherId = t.buyer_id === user.id ? t.seller_id : t.buyer_id;
      const [pRes, lRes, mRes] = await Promise.all([
        supabase.from("profiles").select("display_name, username").eq("user_id", otherId).maybeSingle(),
        supabase.from("listings").select("title, photos").eq("id", t.listing_id).maybeSingle(),
        supabase.from("messages").select("id, thread_id, sender_id, body, created_at").eq("thread_id", id).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;

      const photos = parsePhotos(lRes.data?.photos);

      setInfo({
        ...t,
        listing_id: String(t.listing_id),
        other_name: pRes.data?.display_name || pRes.data?.username || "User",
        listing_title: lRes.data?.title ?? null,
        listing_photo: photos[0] ?? null,
      });
      setMessages((mRes.data ?? []) as Message[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, id]);

  useEffect(() => {
    if (!id || !user) return;
    const channel = supabase
      .channel(`thread:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${id}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !body.trim() || sending) return;
    setSending(true);
    const text = body.trim();
    setBody("");
    const { error } = await supabase.from("messages").insert({ thread_id: id, sender_id: user.id, body: text });
    setSending(false);
    if (error) {
      toast.error("Couldn't send message");
      setBody(text);
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!info) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="container py-10 text-center">
          <p className="font-semibold">Conversation not found</p>
          <Button asChild className="mt-4"><Link to="/messages">Back to inbox</Link></Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="border-b border-border bg-background sticky top-16 z-30">
        <div className="container max-w-2xl py-3 flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="text-muted-foreground hover:text-foreground" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{info.other_name}</p>
            {info.listing_title && (
              <Link to={`/listing/${info.listing_id}`} className="text-xs text-muted-foreground truncate hover:underline block">
                re: {info.listing_title}
              </Link>
            )}
          </div>
          {info.listing_photo && (
            <Link to={`/listing/${info.listing_id}`} className="shrink-0">
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted">
                <Img src={info.listing_photo} alt="" className="h-full w-full object-cover" />
              </div>
            </Link>
          )}
          <ReportDialog targetType="thread" targetId={info.id} />
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl py-6 space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">Say hello 👋</p>
          ) : messages.map((m) => {
            const mine = m.sender_id === user!.id;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap break-words",
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"
                )}>
                  {m.body}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={send} className="border-t border-border bg-background sticky bottom-0">
        <div className="container max-w-2xl py-3 flex gap-2">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="rounded-full"
            maxLength={1000}
          />
          <Button type="submit" size="icon" className="rounded-full shrink-0" disabled={!body.trim() || sending} aria-label="Send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MessageThread;
