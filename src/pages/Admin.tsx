import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, ShieldAlert, Package, Users, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AdminOrder {
  id: string;
  status: string;
  total_pence: number;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  ship_to_name: string;
  ship_to_city: string;
  ship_to_postcode: string;
  dispute_status: string | null;
  dispute_description: string | null;
  cancellation_requested_by: string | null;
  cancellation_reason: string | null;
  cancellation_agreed: boolean | null;
  payout_sent: boolean | null;
  stripe_payment_intent_id: string | null;
}

interface AdminUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
  email?: string;
  stripe_connect_enabled: boolean | null;
  is_admin: boolean | null;
  created_at?: string;
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;
const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("orders");

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");

  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  // Check admin status
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.is_admin) {
        navigate("/");
        return;
      }
      setIsAdmin(true);
      setChecking(false);
    })();
  }, [user, navigate]);

  // Load orders
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total_pence, created_at, buyer_id, seller_id, ship_to_name, ship_to_city, ship_to_postcode, dispute_status, dispute_description, cancellation_requested_by, cancellation_reason, cancellation_agreed, payout_sent, stripe_payment_intent_id")
        .order("created_at", { ascending: false })
        .limit(200);
      setOrders((data ?? []) as AdminOrder[]);
      setOrdersLoading(false);
    })();
  }, [isAdmin]);

  // Load users
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, stripe_connect_enabled, is_admin")
        .order("user_id", { ascending: false })
        .limit(200);
      setUsers((data ?? []) as AdminUser[]);
      setUsersLoading(false);
    })();
  }, [isAdmin]);

  const handleRefund = async (orderId: string) => {
    setBusy(orderId);
    const { error } = await supabase.functions.invoke("create-refund", { body: { order_id: orderId } });
    if (error) {
      toast.error("Refund failed — " + error.message);
    } else {
      await supabase.from("orders").update({ status: "cancelled" } as never).eq("id", orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
      toast.success("Refund issued");
    }
    setBusy(null);
  };

  const handleApproveCancellation = async (orderId: string, listingId?: string) => {
    setBusy(orderId);
    await supabase.from("orders").update({ cancellation_agreed: true, status: "cancelled" } as never).eq("id", orderId);
    if (listingId) await supabase.from("listings").update({ status: "active" }).eq("id", Number(listingId));
    const { error } = await supabase.functions.invoke("create-refund", { body: { order_id: orderId } });
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled", cancellation_agreed: true } : o));
    toast.success(error ? "Cancelled but refund failed — check Stripe" : "Cancellation approved and refund issued");
    setBusy(null);
  };

  const handleResolveDispute = async (orderId: string, resolution: "refund" | "seller_wins") => {
    setBusy(orderId + resolution);
    if (resolution === "refund") {
      const { error } = await supabase.functions.invoke("create-refund", { body: { order_id: orderId } });
      await supabase.from("orders").update({ dispute_status: "refunded", status: "cancelled" } as never).eq("id", orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, dispute_status: "refunded", status: "cancelled" } : o));
      toast.success(error ? "Status updated but refund failed" : "Dispute resolved — buyer refunded");
    } else {
      await supabase.functions.invoke("create-payout", { body: { order_id: orderId } });
      await supabase.from("orders").update({ dispute_status: "resolved", status: "delivered" } as never).eq("id", orderId);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, dispute_status: "resolved", status: "delivered" } : o));
      toast.success("Dispute resolved — seller paid out");
    }
    setBusy(null);
  };

  const filteredOrders = orders.filter((o) =>
    !orderSearch ||
    o.id.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.ship_to_name?.toLowerCase().includes(orderSearch.toLowerCase()) ||
    o.status.toLowerCase().includes(orderSearch.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    !userSearch ||
    (u.username ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.display_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
    u.user_id.toLowerCase().includes(userSearch.toLowerCase())
  );

  const openDisputes = orders.filter((o) => o.dispute_status === "open");
  const pendingCancellations = orders.filter((o) => o.cancellation_requested_by && !o.cancellation_agreed && o.status !== "cancelled");

  if (authLoading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <h1 className="font-display font-bold text-3xl tracking-tight">Admin Dashboard</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total orders</p>
            <p className="font-display font-bold text-2xl mt-1">{orders.length}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Open disputes</p>
            <p className="font-display font-bold text-2xl mt-1 text-amber-600">{openDisputes.length}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending cancellations</p>
            <p className="font-display font-bold text-2xl mt-1 text-destructive">{pendingCancellations.length}</p>
          </Card>
          <Card className="p-4 rounded-2xl">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total users</p>
            <p className="font-display font-bold text-2xl mt-1">{users.length}</p>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="orders" className="gap-2">
              <Package className="h-4 w-4" /> Orders
              {(openDisputes.length + pendingCancellations.length) > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {openDisputes.length + pendingCancellations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Disputes
              {openDisputes.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {openDisputes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
          </TabsList>

          {/* ORDERS */}
          <TabsContent value="orders">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, name or status..."
                className="pl-10 rounded-full"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
              />
            </div>
            {ordersLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-3">
                {filteredOrders.map((o) => (
                  <Card key={o.id} className="p-4 rounded-2xl">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                          <Badge variant={o.status === "cancelled" ? "destructive" : o.status === "delivered" ? "default" : "secondary"} className="rounded-full text-[10px] uppercase">
                            {statusLabel(o.status)}
                          </Badge>
                          {o.dispute_status && o.dispute_status !== "none" && (
                            <Badge variant="outline" className="rounded-full text-[10px] uppercase border-amber-400 text-amber-600">
                              Dispute: {o.dispute_status}
                            </Badge>
                          )}
                          {o.cancellation_requested_by && !o.cancellation_agreed && o.status !== "cancelled" && (
                            <Badge variant="outline" className="rounded-full text-[10px] uppercase border-destructive text-destructive">
                              Cancel requested
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold">{o.ship_to_name} · {o.ship_to_city} {o.ship_to_postcode}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{formatGbp(o.total_pence)}
                          {o.payout_sent && " · Paid out"}
                        </p>
                        {o.cancellation_reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Cancel reason: {o.cancellation_reason}</p>
                        )}
                        {o.dispute_description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Dispute: {o.dispute_description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        {/* Approve cancellation */}
                        {o.cancellation_requested_by && !o.cancellation_agreed && o.status !== "cancelled" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs border-destructive text-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleApproveCancellation(o.id)}
                            disabled={busy === o.id}
                          >
                            {busy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Approve cancel"}
                          </Button>
                        )}
                        {/* Manual refund */}
                        {o.status !== "cancelled" && !o.payout_sent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            onClick={() => handleRefund(o.id)}
                            disabled={busy === o.id}
                          >
                            {busy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Issue refund"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
                {filteredOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-10">No orders found</p>
                )}
              </div>
            )}
          </TabsContent>

          {/* DISPUTES */}
          <TabsContent value="disputes">
            {openDisputes.length === 0 ? (
              <Card className="p-10 text-center rounded-2xl">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No open disputes</p>
                <p className="text-sm text-muted-foreground mt-1">All disputes have been resolved.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {openDisputes.map((o) => (
                  <Card key={o.id} className="p-5 rounded-2xl border-amber-200 bg-amber-50">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="font-semibold text-amber-800">Open dispute</span>
                          <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-semibold">{o.ship_to_name} · {formatGbp(o.total_pence)}</p>
                        <div className="bg-white rounded-xl p-3 border border-amber-100 mt-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Buyer's description</p>
                          <p className="text-sm">{o.dispute_description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="rounded-full text-xs bg-destructive hover:bg-destructive/90"
                          onClick={() => handleResolveDispute(o.id, "refund")}
                          disabled={!!busy}
                        >
                          {busy === o.id + "refund" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refund buyer"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full text-xs"
                          onClick={() => handleResolveDispute(o.id, "seller_wins")}
                          disabled={!!busy}
                        >
                          {busy === o.id + "seller_wins" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pay out seller"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* USERS */}
          <TabsContent value="users">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username, display name or user ID..."
                className="pl-10 rounded-full"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            {usersLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-3">
                {filteredUsers.map((u) => (
                  <Card key={u.user_id} className="p-4 rounded-2xl">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold truncate">{u.display_name || u.username || "No name"}</p>
                          {u.username && <span className="text-xs text-muted-foreground">@{u.username}</span>}
                          {u.is_admin && <Badge className="rounded-full text-[10px]">Admin</Badge>}
                          {u.stripe_connect_enabled && <Badge variant="outline" className="rounded-full text-[10px] border-green-400 text-green-600">Payouts on</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{u.user_id}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-xs shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(u.user_id);
                          toast.success("User ID copied");
                        }}
                      >
                        Copy ID
                      </Button>
                    </div>
                  </Card>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-10">No users found</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Admin;