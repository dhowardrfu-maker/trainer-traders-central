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
import { Heart, Loader2, Package, Pencil, Plus, QrCode, ShoppingBag, Tag, Trash2, Truck, User as UserIcon } from "lucide-react";
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
}

const formatGbp = (pence: number) => `£${(pence / 100).toFixed(2)}`;

const statusLabel = (status: string) =>
  status.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

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

  const [listings, setListings] = useState<MyListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [offerRows, setOfferRows] = useState<Array<{
    id: string; amount_pence: number; status: string; buyer_id: string; seller_id: string;
    listing_id: string; created_at: string; listing_title?: string; listing_photo?: string | null;
  }>>([]);
  const [offersLoading, setOffersLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (tab !== initialTab) setSearchParams({ tab }, { replace: true });
  }, [tab, initialTab, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, bio, location, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setUsername(data.username ?? "");
        setBio(data.bio ?? "");
        setLocation(data.location ?? "");
        setAvatarUrl(data.avatar_url ?? "");
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
      if (!error && data) setListings(data as MyListing[]);
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
          .select("id, listing_id, buyer_id, seller_id, carrier, service_label, status, total_pence, tracking_code, created_at, ship_to_name, ship_to_line1, ship_to_line2, ship_to_city, ship_to_postcode")
          .eq("buyer_id", user.id),
        supabase.rpc("get_my_sales"),
      ]);
      if (cancelled) return;
      const merged = [
        ...(buyRes.data ?? []),
        ...((sellRes.data ?? []) as unknown as OrderRow[]),
      ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setOrders(merged as OrderRow[]);
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
        listingMap = Object.fromEntries((ls ?? []).map((l: any) => [l.id, l]));
      }
      setOfferRows(rows.map((r) => ({
        ...r,
        listing_title: listingMap[r.listing_id]?.title,
        listing_photo: listingMap[r.listing_id]?.photos?.[0] ?? null,
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
        .in("id", idArr);
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
      setSavedListings(rows.map((r) => mapDbListing({ ...r, profile: profiles[r.seller_id] ?? null })));
      setSavedLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, favIds]);

  const purchases = useMemo(() => orders.filter((o) => o.buyer_id === user?.id), [orders, user]);
  const sales = useMemo(() => orders.filter((o) => o.seller_id === user?.id), [orders, user]);

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
    const { error } = await supabase.from("listings").delete().eq("id", id);
    if (error) { toast.error("Couldn't delete listing"); return; }
    setListings((prev) => prev.filter((l) => l.id !== id));
    toast.success("Listing deleted");
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initial = (displayName || username || user.email || "U")[0].toUpperCase();

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

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-5 w-full mb-6">
            <TabsTrigger value="profile" className="gap-1.5">
              <UserIcon className="h-4 w-4" /> <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="listings" className="gap-1.5">
              <ShoppingBag className="h-4 w-4" /> <span className="hidden sm:inline">Listings</span>
            </TabsTrigger>
            <TabsTrigger value="offers" className="gap-1.5">
              <Tag className="h-4 w-4" /> <span className="hidden sm:inline">Offers</span>
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Heart className="h-4 w-4" /> <span className="hidden sm:inline">Saved</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <Package className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
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
                <div className="grid gap-2">
                  <Label htmlFor="display_name">Display name</Label>
                  <Input id="display_name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="How should buyers see you?" maxLength={60} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="lowercase, letters/numbers" maxLength={30} />
                  <p className="text-xs text-muted-foreground">Lowercase letters, numbers and underscores only.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London, UK" maxLength={80} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input id="avatar" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell buyers about your collection…" rows={4} maxLength={300} />
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
                  const role = o.buyer_id === user.id ? "Sent" : "Received";
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
                      {o.status === "accepted" && o.buyer_id === user.id && (
                        <Button size="sm" className="rounded-full" onClick={() => navigate(`/checkout/${o.listing_id}?offer=${o.id}`)}>Buy</Button>
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
                <OrderSection title="Purchases" empty="You haven't bought anything yet." rows={purchases} isSales={false} />
                <OrderSection title="Sales" empty="No sales yet — keep listing!" rows={sales} isSales={true} />
              </div>
            )}
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
}: {
  title: string;
  empty: string;
  rows: OrderRow[];
  isSales?: boolean;
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
          <Card key={o.id} className="p-4 rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">
                    {carrierLabel(o.carrier)} · {o.service_label}
                  </span>
                  <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-wide">
                    {statusLabel(o.status)}
                  </Badge>
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
                {isSales && (
                  
                    href="https://account.royalmail.com/sending/click-drop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Truck className="h-3 w-3" /> Ship this order
                  </a>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold">{formatGbp(o.total_pence)}</p>
                <Link
                  to={`/order/${o.id}`}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  <QrCode className="h-3 w-3" /> Label
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )}
  </section>
);

export default Profile;