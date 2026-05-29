import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!user) { setUnreadCount(0); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: threads } = await (supabase as any)
      .from("threads")
      .select("id, last_message_at")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .not("last_message_at", "is", null);

    if (!threads || threads.length === 0) { setUnreadCount(0); return; }

    const threadIds = threads.map((t: any) => t.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reads } = await (supabase as any)
      .from("thread_reads")
      .select("thread_id, last_read_at")
      .eq("user_id", user.id)
      .in("thread_id", threadIds);

    const readMap: Record<string, string> = {};
    for (const r of reads ?? []) {
      readMap[r.thread_id] = r.last_read_at;
    }

    let count = 0;
    for (const thread of threads) {
      const lastRead = readMap[thread.id];
      if (!lastRead || new Date(thread.last_message_at) > new Date(lastRead)) {
        count++;
      }
    }

    setUnreadCount(count);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "threads" },
        () => { void load(); }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_reads", filter: `user_id=eq.${user.id}` },
        () => { void load(); }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "thread_reads", filter: `user_id=eq.${user.id}` },
        () => { void load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const markThreadRead = useCallback(async (threadId: string) => {
    if (!user) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("thread_reads")
      .upsert(
        { thread_id: threadId, user_id: user.id, last_read_at: new Date().toISOString() },
        { onConflict: "thread_id,user_id" }
      );
    void load();
  }, [user, load]);

  return { unreadCount, markThreadRead };
};