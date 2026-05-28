import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const timeAgo = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const NotificationsBell = () => {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <DropdownMenu onOpenChange={(o) => { if (o && unreadCount > 0) void markAllRead(); }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[#2d9b6f] text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 max-h-[420px] overflow-y-auto">
        <DropdownMenuLabel className="px-4 py-3 flex items-center justify-between sticky top-0 bg-background z-10">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground font-normal">{unreadCount} new</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-border last:border-0">
                <button
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-muted/60 transition-colors block",
                    !n.read && "bg-[#2d9b6f]/6 border-l-2 border-l-[#2d9b6f]"
                  )}
                  onClick={() => {
                    void markRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-[#2d9b6f] shrink-0" />
                    )}
                    <div className={cn("flex-1 min-w-0", n.read && "pl-4")}>
                      <p className="font-semibold text-sm leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wide">
                        {timeAgo(n.created_at)} ago
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
