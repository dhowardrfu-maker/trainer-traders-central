import { useEffect, useMemo, useState } from "react";
import { Img } from "@/components/Img";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Camera, CheckCircle2, CreditCard, Heart, Loader2, Package, Pencil, Plus, Settings, ShoppingBag, Tag, Trash2, Truck, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useFavourites } from "@/hooks/useFavourites";
import { supabase } from "@/integrations/supabase/client";
import { carrierLabel } from "@/data/carriers";
import { ProductCard } from "@/components/ProductCard";
import { mapDbListing, type Listing } from "@/data/listings";

interface ProfileRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  full_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  stripe_connect_id: string | null;
  stripe_connect_enabled: boolean | null;
}

interface MyListing {
  id: string;
  title: string;
  brand: string;
  price_pence: number;
  status: string;
  photos: string[];
  created_at: string;
}

interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  carrier: "royal_mail";
  service_label: string;
  status: string;
  total_pence: number;
  tracking_code: string;
  created_at: string;
  ship_to_name: string;
  ship_to_line1?: string;
  ship_to_line2?: string | null;
  ship_to_city: string;
  ship_to_postcode: string;
  cancellation_requested_by: string | null;
  cancellation_reason: string | null;
  cancellation_agreed: boolean | null;
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

// Helper — insert a notification row directly into the notifications table
const notify = async (userId: string, type: string, title: string, body: string | null, link: string | null) => {
  await supabase.from("notifications").insert({
    user_id: userId,
    type,
    title,
    body,
    link,
    read: false,
  });
};

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const { ids: favIds } = useFavourites();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";
  const [tab, setTab] = useState(initialTab);

  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phone, setPhone] = useState("");
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectEnabled, setConnectEnabled] = useState(false);

  const [listings, setListings] = useState<MyListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);

  const [offerRows, setOfferRows] = useState<Array<{
    id: string; amount_pence: number; status: string; buyer_id: string; seller_id: string;
    listing_id: string; created_at: string; listing_title?: string; listing_photo?: string | null;
  }>>([]);
  const [offersLoading, setOffersLoading] = useState(true);
  const [offerBusy, setOfferBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (tab !== initialTab) setSearchParams({ tab }, { replace: true });
  }, [tab, initialTab, setSearchParams]);

  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "success") {
      toast.success("Payout account connected — you're ready to receive payments!");
      if (user) {
        supabase.functions.invoke("get-connect-status").then(({ data }) => {
          if (data?.enabled) {
            setProfile((prev) => prev ? { ...prev, stripe_connect_enabled: true } : prev);
          setConnectEnabled(true);
          }
        });
      }
      setSearchParams({ tab: "payments" }, { replace: true });
    } else if (connectParam === "refresh") {
      toast.error("Payout setup incomplete — please try again.");
      setSearchParams({ tab: "payments" }, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, bio, location, avatar_url, full_name, address_line1, address_line2, city, postcode, phone, stripe_connect_id, stripe_connect_enabled")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProfile(data);
        setConnectEnabled(data.stripe_connect_enabled === true);
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setAvatarUrl(data.avatar_url ?? "");
        setFullName(data.full_name ?? "");
        setAddressLine1(data.address_line1 ?? "");
        setAddressLine2(data.address_line2 ?? "");
        setCity(data.city ?? "");
        setPostcode(data.postcode ?? "");
        setPhone(data.phone ?? "");
      }
      setProfileLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("id, title, brand, price_pence, status, photos, created_at")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error && data) setListings(data.map((row) => {
        const raw = row.photos;
        let photos: string[] = [];
        if (Array.isArray(raw)) photos = raw as string[];
        else if (typeof raw === "string") {
          try { photos = JSON.parse(raw); } catch { photos = []; }
        }
        return { ...row, id: String(row.id), photos };
      }) as MyListing[]);
      setListingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [buyRes, sellRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, listing_id, buyer_id, seller_id, carrier, service_label, status, total_pence, tracking_code, created_at, ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode, cancellation_requested_by, cancellation_reason, cancellation_agreed")
          .eq("buyer_id", user.id),
        supabase.rpc("get_my_sales"),
      ]);
      if (cancelled) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toOrderRow = (row: any): OrderRow => ({ ...row, id: String(row.id), listing_id: String(row.listing_id) });
      const merged = [
        ...(buyRes.data ?? []).map(toOrderRow),
        ...((sellRes.data ?? []) as unknown[]).map(toOrderRow),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setOrders(merged);
      setOrdersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("offers")
        .select("id, amount_pence, status, buyer_id, seller_id, listing_id, created_at")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (cancelled || !rows) { setOffersLoading(false); return; }
      const listingIds = Array.from(new Set(rows.map((r) => r.listing_id)));
      let listingMap: Record<string, { title: string; photos: string[] }> = {};
      if (listingIds.length) {
        const { data: ls } = await supabase.from("listings").select("id, title, photos").in("id", listingIds);
        listingMap = Object.fromEntries((ls ?? []).map((l) => {
          const raw = l.photos;
          let photos: string[] = [];
          if (Array.isArray(raw)) photos = raw as string[];
          else if (typeof raw === "string") {
            try { photos = JSON.parse(raw); } catch { photos = []; }
          }
          return [String(l.id), { title: l.title as string, photos }];
        }));
      }
      setOfferRows(rows.map((r) => ({
        ...r,
        id: String(r.id),
        listing_id: String(r.listing_id),
        listing_title: listingMap[String(r.listing_id)]?.title,
        listing_photo: listingMap[String(r.listing_id)]?.photos?.[0] ?? null,
      })));
      setOffersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setSavedLoading(true);
    (async () => {
      const idArr = Array.from(favIds);
      if (idArr.length === 0) {
        if (!cancelled) { setSavedListings([]); setSavedLoading(false); }
        return;
      }
      const { data: rows } = await supabase
        .from("listings")
        .select("id, title, brand, size_uk, size_eu, condition, gender, color, description, price_pence, photos, created_at, seller_id")
        .in("id", idArr.map(Number));
      if (cancelled) return;
      if (!rows) { setSavedListings([]); setSavedLoading(false); return; }
      const sellerIds = Array.from(new Set(rows.map((r) => r.seller_id)));
      let profiles: Record<string, { username: string | null; display_name: string | null }> = {};
      if (sellerIds.length > 0) {
        const { data: profileRows } = await supabase
          .from("profiles")
          .select("user_id, username, display_name")
          .in("user_id", sellerIds);
        if (profileRows) {
          profiles = Object.fromEntries(
            profileRows.map((p) => [p.user_id, { username: p.username, display_name: p.display_name }])
          );
        }
      }
      setSavedListings(rows.map((r) => mapDbListing({ ...r, id: String(r.id), profile: profiles[r.seller_id] ?? null })));
      setSavedLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, favIds]);

  const purchases = useMemo(() => orders.filter((o) => o.buyer_id === user?.id), [orders, user]);
  const sales = useMemo(() => orders.filter((o) => o.seller_id === user?.id), [orders, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setAvatarUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `avatars/${user.id}.${ext}`;
    const { error } = await supabase.storage
      .from("listing-photos")
      .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
    if (error) { toast.error("Couldn't upload photo"); setAvatarUploading(false); return; }
    const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
    setAvatarUrl(data.publicUrl);
    // Also update Supabase auth metadata so the header avatar updates
    await supabase.auth.updateUser({ data: { avatar_url: data.publicUrl } });
    setAvatarUploading(false);
    toast.success("Photo uploaded — save your profile to apply it");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const trimmedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        username: trimmedUsername || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        full_name: fullName.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        postcode: postcode.trim().toUpperCase() || null,
        phone: phone.trim() || null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Username already taken" : "Couldn't save profile");
      return;
    }
    toast.success("Profile updated");
    setUsername(trimmedUsername);
  };

  const handleDeleteListing = async (id: string) => {
    const { error } = await supabase.from("listings").delete().eq("id", Number(id));
    if (error) { toast.error("Couldn't delete listing"); return; }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast.success("Listing deleted");
  };

  const handleConnectPayout = async () => {
    setConnectLoading(true);
    const { data, error } = await supabase.functions.invoke("create-connect-account");
    setConnectLoading(false);
    if (error || !data?.url) {
      toast.error("Couldn't start payout setup — please try again");
      return;
    }
    window.location.href = data.url;
  };

  // ACCEPT OFFER
  const handleAcceptOffer = async (offerId: string, buyerId: string, listingId: string, listingTitle: string, amountPence: number) => {
    setOfferBusy(offerId);
    const { error } = await supabase
      .from("offers")
      .update({ status: "accepted" })
      .eq("id", offerId);
    if (error) { setOfferBusy(null); toast.error("Couldn't accept offer"); return; }

    // Notify buyer
    await notify(
      buyerId,
      "offer_accepted",
      "Your offer was accepted! 🎉",
      `Your offer of £${(amountPence / 100).toFixed(2)} on ${listingTitle ?? "a listing"} was accepted. Tap to complete your purchase.`,
      `/checkout/${listingId}?offer=${offerId}`
    );

    setOfferBusy(null);
    toast.success("Offer accepted — buyer has been notified");
    setOfferRows((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "accepted" } : o));
  };

  // DECLINE OFFER
  const handleDeclineOffer = async (offerId: string, buyerId: string, listingTitle: string, amountPence: number) => {
    setOfferBusy(offerId);
    const { error } = await supabase
      .from("offers")
      .update({ status: "rejected" })
      .eq("id", offerId);
    if (error) { setOfferBusy(null); toast.error("Couldn't decline offer"); return; }

    // Notify buyer
    await notify(
      buyerId,
      "offer_declined",
      "Your offer was declined",
      `Your offer of £${(amountPence / 100).toFixed(2)} on ${listingTitle ?? "a listing"} was not accepted by the seller.`,
      null
    );

    setOfferBusy(null);
    toast.success("Offer declined");
    setOfferRows((prev) => prev.map((o) => o.id === offerId ? { ...o, status: "rejected" } : o));
  };

  const handleAgreeCancel = async (orderId: string, listingId: string, requestedBy: string) => {
    setCancelBusy(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ cancellation_agreed: true, status: "cancelled" } as never)
      .eq("id", orderId);
    if (error) { setCancelBusy(null); toast.error("Couldn't process cancellation"); return; }
    await supabase.from("listings").update({ status: "active" }).eq("id", Number(listingId));
    const { error: refundErr } = await supabase.functions.invoke("create-refund", { body: { order_id: orderId } });

    // Notify the party who originally requested cancellation
    await notify(
      requestedBy,
      "cancellation_agreed",
      "Cancellation agreed — refund issued",
      "The other party agreed to cancel. A full refund has been issued.",
      `/order/${orderId}`
    );

    setCancelBusy(null);
    toast.success(refundErr ? "Cancelled but refund failed — contact support" : "Order cancelled and refund issued");
    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: "cancelled", cancellation_agreed: true } : o));
  };

  // Recheck Connect status from Stripe on load if account exists but not yet enabled
  useEffect(() => {
    if (!user || connectEnabled) return;
    if (!profile?.stripe_connect_id) return;
    supabase.functions.invoke("get-connect-status").then(({ data }) => {
      if (data?.enabled) setConnectEnabled(true);
    });
  }, [user, profile?.stripe_connect_id, connectEnabled]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initial = (displayName || username || user.email || "U")[0].toUpperCase();
  const connectStarted = !!profile?.stripe_connect_id;

  const pendingCancellations = orders.filter(
    (o) => o.cancellation_requested_by && o.cancellation_requested_by !== user.id && !o.cancellation_agreed && o.status !== "cancelled"
  );

  // Pending offers received (seller view — status pending)
  const pendingOffersReceived = offerRows.filter(
    (o) => o.seller_id === user.id && o.status === "pending"
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container py-6 md:py-10 max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="h-16 w-16 border border-border">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary-soft text-primary font-display font-bold text-xl">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight truncate">
              {displayName || username || "Your profile"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {username ? `@${username}` : user.email}
            </p>
          </div>
        </div>

        {/* Pending cancellation banner */}
        {pendingCancellations.length > 0 && (
          <div className="mb-4 space-y-3">
            {pendingCancellations.map((o) => (
              <div key={o.id} className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="font-semibold text-amber-800 text-sm">
                    {o.buyer_id === user.id ? "The seller" : "The buyer"} has requested to cancel an order
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-amber-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">Reason</p>
                  <p className="text-sm">{o.cancellation_reason}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className="rounded-full font-semibold"
                    onClick={() => handleAgreeCancel(o.id, o.listing_id, o.cancellation_requested_by!)}
                    disabled={cancelBusy === o.id}
                  >
                    {cancelBusy === o.id && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                    Agree to cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full font-semibold"
                    onClick={() => window.location.href = `mailto:support@prelovedkicks.co.uk?subject=Order%20Cancellation%20Dispute&body=Order%20ID:%20${o.id}`}
                  >
                    Contact support
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-full" asChild>
                    <Link to={`/order/${o.id}`}>View order</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-7 w-full mb-6">
            <TabsTrigger value="profile" className="gap-1.5">
              <UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5 relative">
              <Tag className="h-4 w-4" /> <span className="hidden sm:inline">Offers</span>
              {pendingOffersReceived.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#2d9b6f] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {pendingOffersReceived.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5 relative">
              <Package className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
              {pendingCancellations.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {pendingCancellations.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-1.5">
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5">
              <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
          </TabsList>

          {/* PROFILE */}
          <TabsContent value="profile">
            {profileLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card className="p-6 space-y-5 rounded-2xl">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 border border-border">
                      {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                      <AvatarFallback className="bg-primary-soft text-primary font-display font-bold text-xl">
                        {initial}
                      </AvatarFallback>
                    </Avatar>
                    <label className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                      {avatarUploading ? (
                        <Loader2 className="h-3 w-3 text-white animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3 text-white" />
                      )}
                      <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} disabled={avatarUploading} />
                    </label>
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold">Profile photo</p>
                    <p className="text-xs text-muted-foreground">JPG or PNG, max 5MB</p>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="display_name">Display name</Label>
                  <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should buyers see you?" maxLength={60} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location <span className="text-muted-foreground font-normal">(public)</span></Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London, UK" maxLength={80} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio">About you <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell buyers about your collection…" rows={6} maxLength={1000} />
                  <p className="text-xs text-muted-foreground text-right">{bio.length}/1000</p>
                </div>
                <div className="border-t border-border pt-5">
                  <p className="text-sm font-semibold mb-4">Shipping address <span className="text-destructive">*</span></p>
                  <p className="text-xs text-muted-foreground mb-4">Required before you can list items for sale. Used as the sender address on shipping labels.</p>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" maxLength={100} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address_line1">Address line 1</Label>
                      <Input id="address_line1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="47 Example Street" maxLength={120} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="address_line2">Address line 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
                      <Input id="address_line2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Apartment, flat, etc." maxLength={120} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="city">Town / City</Label>
                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Stourport on Severn" maxLength={60} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="postcode">Postcode</Label>
                        <Input id="postcode" value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} placeholder="DY13 8PW" maxLength={8} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone number</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07700 900000" maxLength={20} />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving} className="rounded-full font-semibold">
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save changes
                  </Button>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* LISTINGS */}
          <TabsContent value="listings">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">
                {listingsLoading ? "Loading…" : `${listings.length} listing${listings.length === 1 ? "" : "s"}`}
              </p>
              <Button size="sm" className="rounded-full gap-1.5 font-semibold" onClick={() => navigate("/sell")}>
                <Plus className="h-4 w-4" /> New listing
              </Button>
            </div>
            {listingsLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : listings.length === 0 ? (
              <Card className="p-10 text-center rounded-2xl">
                <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">List your first pair to get started.</p>
                <Button className="mt-4 rounded-full font-semibold" onClick={() => navigate("/sell")}>
                  <Plus className="h-4 w-4 mr-1.5" /> Sell something
                </Button>
              </Card>
            ) : (
              <div className="grid gap-3">
                {listings.map((l) => (
                  <Card key={l.id} className="p-3 rounded-2xl flex items-center gap-3">
                    <Link to={`/listing/${l.id}`} className="shrink-0">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted">
                        {l.photos?.[0] ? <Img src={l.photos[0]} alt={l.title} className="h-full w-full object-cover" /> : null}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link to={`/listing/${l.id}`} className="font-semibold truncate hover:underline">{l.title}</Link>
                        <Badge variant={l.status === "active" ? "default" : "secondary"} className="rounded-full text-[10px] uppercase tracking-wide">{l.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{l.brand} · {formatGbp(l.price_pence)}</p>
                    </div>
                    {l.status === "active" && (
                      <>
                        <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Edit listing">
                          <Link to={`/listing/${l.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0" aria-label="Delete listing">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-2xl">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this listing?</AlertDialogTitle>
                              <AlertDialogDescription>"{l.title}" will be removed permanently. This can't be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteListing(l.id)} className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* OFFERS */}
          <TabsContent value="offers">
            {offersLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : offerRows.length === 0 ? (
              <Card className="p-10 text-center rounded-2xl">
                <Tag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No offers yet</p>
                <p className="text-sm text-muted-foreground mt-1">When you make or receive offers, they'll show here.</p>
              </Card>
            ) : (
              <div className="grid gap-3">
                {offerRows.map((o) => {
                  const isSeller = o.seller_id === user.id;
                  const role = isSeller ? "Received" : "Sent";
                  return (
                    <Card key={o.id} className="p-3 rounded-2xl flex items-center gap-3">
                      <Link to={`/listing/${o.listing_id}`} className="shrink-0">
                        <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted">
                          {o.listing_photo ? <Img src={o.listing_photo} alt="" className="h-full w-full object-cover" /> : null}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link to={`/listing/${o.listing_id}`} className="font-semibold truncate hover:underline">{o.listing_title ?? "Listing"}</Link>
                          <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-wide">{role}</Badge>
                          <Badge variant={o.status === "accepted" ? "default" : "outline"} className="rounded-full text-[10px] uppercase tracking-wide">{o.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          £{(o.amount_pence / 100).toFixed(2)} · {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      {/* Buyer: accepted offer — show Buy button */}
                      {o.status === "accepted" && o.buyer_id === user.id && (
                        <Button size="sm" className="rounded-full" onClick={() => navigate(`/checkout/${o.listing_id}?offer=${o.id}`)}>Buy</Button>
                      )}
                      {/* Seller: pending offer — show Accept / Decline */}
                      {isSeller && o.status === "pending" && (
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="rounded-full font-semibold"
                            disabled={offerBusy === o.id}
                            onClick={() => handleAcceptOffer(o.id, o.buyer_id, o.listing_id, o.listing_title ?? "a listing", o.amount_pence)}
                          >
                            {offerBusy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full font-semibold"
                            disabled={offerBusy === o.id}
                            onClick={() => handleDeclineOffer(o.id, o.buyer_id, o.listing_title ?? "a listing", o.amount_pence)}
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* SAVED */}
          <TabsContent value="saved">
            {savedLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : savedListings.length === 0 ? (
              <Card className="p-10 text-center rounded-2xl">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-semibold">No saved listings yet</p>
                <p className="text-sm text-muted-foreground mt-1">Tap the heart on any pair to save them for later.</p>
                <Button className="mt-4 rounded-full font-semibold" onClick={() => navigate("/")}>Browse kicks</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-5">
                {savedListings.map((l) => <ProductCard key={l.id} listing={l} />)}
              </div>
            )}
          </TabsContent>

          {/* ORDERS */}
          <TabsContent value="orders">
            {ordersLoading ? (
              <div className="py-10 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                <OrderSection title="Purchases" empty="You haven't bought anything yet." rows={purchases} isSales={false} userId={user.id} />
                <OrderSection title="Sales" empty="No sales yet — keep listing!" rows={sales} isSales={true} userId={user.id} />
              </div>
            )}
          </TabsContent>

          {/* ACCOUNT SETTINGS */}
          <TabsContent value="account">
            <div className="space-y-4">
              <Card className="p-6 rounded-2xl space-y-5">
                <h2 className="font-display font-bold text-lg">Account settings</h2>
                <div className="grid gap-2">
                  <Label>Email address</Label>
                  <div className="flex items-center gap-2">
                    <Input value={user?.email ?? ""} disabled className="bg-muted" />
                    <span className="text-xs text-green-600 font-semibold whitespace-nowrap">✓ Verified</span>
                  </div>
                </div>
                <div className="border-t border-border pt-5 grid gap-2">
                  <Label>Change password</Label>
                  <p className="text-sm text-muted-foreground">We'll send a password reset link to your email address.</p>
                  <Button
                    variant="outline"
                    className="rounded-full w-fit"
                    onClick={async () => {
                      if (!user?.email) return;
                      await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: "https://www.prelovedkicks.co.uk/auth" });
                      toast.success("Password reset email sent");
                    }}
                  >
                    Send reset email
                  </Button>
                </div>
                <div className="border-t border-border pt-5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">Holiday mode</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Pause your listings while you're away. Buyers won't be able to purchase.</p>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Coming soon</span>
                </div>
                <div className="border-t border-border pt-5">
                  <p className="font-semibold text-sm text-destructive">Danger zone</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Permanently delete your account and all your data.</p>
                  <Button variant="outline" className="rounded-full text-destructive border-destructive hover:bg-destructive hover:text-white" onClick={() => toast.error("Please contact support@prelovedkicks.co.uk to delete your account.")}>
                    Delete account
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* PAYMENTS */}
          <TabsContent value="payments">
            <Card className="p-6 rounded-2xl space-y-5">
              <h2 className="font-display font-bold text-lg">Payments</h2>
              <div className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Seller payouts</p>
                  {connectEnabled && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {connectEnabled
                    ? "Your bank account is connected. You'll receive payouts automatically after delivery is confirmed."
                    : "Connect your bank account to receive payouts when your items are delivered. Takes about 2 minutes."}
                </p>
                {!connectEnabled && (
                  <Button className="rounded-full font-semibold" onClick={handleConnectPayout} disabled={connectLoading}>
                    {connectLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {connectStarted ? "Continue payout setup" : "Set up payouts"}
                  </Button>
                )}
              </div>
              <div className="border-t border-border pt-5">
                <p className="font-semibold text-sm mb-1">Payment methods</p>
                <p className="text-sm text-muted-foreground">Accepted: Visa, Mastercard, Amex, Google Pay, Apple Pay, Klarna, Amazon Pay, Revolut Pay.</p>
              </div>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
      <MobileTabBar />
    </div>
  );
};

const OrderSection = ({
  title,
  empty,
  rows,
  isSales = false,
  userId,
}: {
  title: string;
  empty: string;
  rows: OrderRow[];
  isSales?: boolean;
  userId: string;
}) => (
  <section>
    <h2 className="font-display font-bold text-lg mb-3">{title}</h2>
    {rows.length === 0 ? (
      <Card className="p-6 text-center rounded-2xl">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </Card>
    ) : (
      <div className="grid gap-3">
        {rows.map((o) => (
          <Link key={o.id} to={`/order/${o.id}`} className="block">
            <Card className="p-4 rounded-2xl hover:border-primary/40 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">
                      {carrierLabel(o.carrier)} · {o.service_label}
                    </span>
                    <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-wide">
                      {statusLabel(o.status)}
                    </Badge>
                    {o.cancellation_requested_by && o.cancellation_requested_by !== userId && !o.cancellation_agreed && o.status !== "cancelled" && (
                      <Badge variant="outline" className="rounded-full text-[10px] uppercase border-amber-400 text-amber-600">
                        Cancel requested
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    {o.tracking_code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    To {o.ship_to_name} · {o.ship_to_city} {o.ship_to_postcode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {isSales && o.status !== "cancelled" && (
                    <span onClick={(e) => e.preventDefault()} className="inline-block mt-3">
                      <Link
                        to={`/shipping/${o.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Truck className="h-3 w-3" /> Ship this order
                      </Link>
                    </span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold">{formatGbp(o.total_pence)}</p>
                  <span className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                    <Package className="h-3 w-3" /> View order
                  </span>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    )}
  </section>
);

export default Profile;
