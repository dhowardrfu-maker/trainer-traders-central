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
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-xl p-0 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="px-4 py-3 flex items-center justify-between sticky top-0 bg-background">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="text-xs text-muted-foreground font-normal">{unreadCount} new</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground text-center">No notifications yet</p>
        ) : (
          <ul>
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors block",
                    !n.read && "bg-primary-soft/30"
                  )}
                  onClick={() => {
                    void markRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                >
                  <p className="font-semibold text-sm">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{timeAgo(n.created_at)} ago</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
