import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, ShieldAlert, Package, Users, AlertTriangle, Mail, ImagePlus, X } from "lucide-react";
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

  // Internal Emails
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [campaignTitle, setCampaignTitle] = useState("");
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignImageFile, setCampaignImageFile] = useState<File | null>(null);
  const [campaignImagePreview, setCampaignImagePreview] = useState<string | null>(null);
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignConfirmOpen, setCampaignConfirmOpen] = useState(false);
  const [campaignResult, setCampaignResult] = useState<{ sent: number; failures: { email: string; error: string }[] } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
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
      await supabase.rpc("admin_update_order", { _order_id: orderId, _status: "cancelled" });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled" } : o));
      toast.success("Refund issued");
    }
    setBusy(null);
  };

  const handleApproveCancellation = async (orderId: string, listingId?: string) => {
    setBusy(orderId);
    await supabase.rpc("admin_update_order", { _order_id: orderId, _status: "cancelled", _cancellation_agreed: true });
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
      await supabase.rpc("admin_update_order", { _order_id: orderId, _status: "cancelled", _dispute_status: "refunded" });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, dispute_status: "refunded", status: "cancelled" } : o));
      toast.success(error ? "Status updated but refund failed" : "Dispute resolved — buyer refunded");
    } else {
      await supabase.functions.invoke("create-payout", { body: { order_id: orderId } });
      await supabase.rpc("admin_update_order", { _order_id: orderId, _status: "delivered", _dispute_status: "resolved" });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, dispute_status: "resolved", status: "delivered" } : o));
      toast.success("Dispute resolved — seller paid out");
    }
    setBusy(null);
  };

  const handleCampaignImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCampaignImageFile(file);
    setCampaignImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveCampaignImage = () => {
    setCampaignImageFile(null);
    setCampaignImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendCampaign = async () => {
    if (!campaignTitle.trim() || !campaignMessage.trim()) {
      toast.error("Add a title and a message first");
      return;
    }
    setCampaignConfirmOpen(false);
    setCampaignSending(true);
    setCampaignResult(null);
    try {
      let imageUrl: string | null = null;
      if (campaignImageFile) {
        const ext = (campaignImageFile.name.split(".").pop() || "jpg").toLowerCase();
        const path = `campaign-${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("marketing-assets")
          .upload(path, campaignImageFile, { cacheControl: "3600", upsert: false, contentType: campaignImageFile.type });
        if (upErr) throw new Error("Image upload failed: " + upErr.message);
        const { data: pub } = supabase.storage.from("marketing-assets").getPublicUrl(path);
        imageUrl = pub.publicUrl;
      }

      const { data, error } = await supabase.functions.invoke("send-campaign-email", {
        body: { title: campaignTitle.trim(), message: campaignMessage.trim(), image_url: imageUrl },
      });
      if (error) throw error;

      setCampaignResult({ sent: data.sent ?? 0, failures: data.failures ?? [] });
      toast.success(`Sent to ${data.sent ?? 0} users`);
      setCampaignTitle("");
      setCampaignMessage("");
      handleRemoveCampaignImage();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    }
    setCampaignSending(false);
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
            <TabsTrigger value="internal-emails" className="gap-2">
              <Mail className="h-4 w-4" /> Internal Emails
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

          {/* INTERNAL EMAILS */}
          <TabsContent value="internal-emails">
            <Card className="p-5 rounded-2xl max-w-xl">
              <h2 className="font-semibold text-lg mb-1">Send a message to every user</h2>
              <p className="text-sm text-muted-foreground mb-5">
                This sends a short "you've got a new message" email to every signed-up user's inbox,
                and the full message below (with image, if you add one) appears in their in-app Messages.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign-title">Title</Label>
                  <Input
                    id="campaign-title"
                    className="rounded-xl mt-1.5"
                    placeholder="e.g. List your trainers in under a minute"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    maxLength={120}
                  />
                </div>

                <div>
                  <Label htmlFor="campaign-message">Message</Label>
                  <Textarea
                    id="campaign-message"
                    className="rounded-xl mt-1.5 min-h-[120px]"
                    placeholder="Write the full message here..."
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    maxLength={2000}
                  />
                </div>

                <div>
                  <Label>Image (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleCampaignImageSelect}
                  />
                  {campaignImagePreview ? (
                    <div className="relative mt-1.5 w-fit">
                      <img src={campaignImagePreview} alt="" className="max-h-48 rounded-xl border border-border" />
                      <button
                        type="button"
                        onClick={handleRemoveCampaignImage}
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-foreground text-background flex items-center justify-center"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl mt-1.5 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" /> Upload image
                    </Button>
                  )}
                </div>

                <Button
                  className="rounded-full w-full"
                  disabled={campaignSending || !campaignTitle.trim() || !campaignMessage.trim()}
                  onClick={() => setCampaignConfirmOpen(true)}
                >
                  {campaignSending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Send to all ${users.length} users`}
                </Button>

                {campaignResult && (
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="font-medium">Sent to {campaignResult.sent} users.</p>
                    {campaignResult.failures.length > 0 && (
                      <p className="text-destructive mt-1">
                        {campaignResult.failures.length} email(s) failed to send (in-app message still delivered to them).
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>

            <AlertDialog open={campaignConfirmOpen} onOpenChange={setCampaignConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send to all {users.length} users?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will immediately email and message every signed-up user. This can't be undone or unsent.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSendCampaign}>Send now</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>
        </Tabs>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default Admin;
