import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BRANDS, CONDITIONS, GENDERS, UK_SIZES, ukToEu } from "@/data/listing-options";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

const schema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(80, "Max 80 characters"),
  brand: z.string().min(1, "Pick a brand"),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  size_uk: z.number({ invalid_type_error: "Pick a size" }).min(1).max(20),
  condition: z.enum(["new_with_tags", "like_new", "very_good", "good", "worn"]),
  gender: z.enum(["mens", "womens", "unisex", "kids"]),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  price: z.number({ invalid_type_error: "Set a price" }).min(1, "Min £1").max(10000, "Max £10,000"),
  description: z.string().trim().max(1000, "Max 1000 characters").optional().or(z.literal("")),
});

const Sell = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    size_uk: "" as number | "",
    condition: "" as typeof CONDITIONS[number]["value"] | "",
    gender: "unisex" as typeof GENDERS[number]["value"],
    color: "",
    price: "" as number | "",
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  // Build object URLs for previews and clean them up
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const onAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) {
        toast.error(`${f.name} isn't an image`);
        return false;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is over 5MB`);
        return false;
      }
      return true;
    });
    setPhotos((prev) => [...prev, ...incoming].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (idx: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const uploadAllPhotos = async (): Promise<string[]> => {
    if (!user) throw new Error("Not signed in");
    const urls: string[] = [];
    for (const file of photos) {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (photos.length === 0) {
      toast.error("Add at least one photo");
      return;
    }

    const parsed = schema.safeParse({
      title: form.title,
      brand: form.brand,
      model: form.model,
      size_uk: form.size_uk === "" ? undefined : Number(form.size_uk),
      condition: form.condition || undefined,
      gender: form.gender,
      color: form.color,
      price: form.price === "" ? undefined : Number(form.price),
      description: form.description,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const photoUrls = await uploadAllPhotos();
      const d = parsed.data;
      const { data: row, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title: d.title,
          brand: d.brand,
          model: d.model || null,
          size_uk: d.size_uk,
          size_eu: ukToEu(d.size_uk),
          condition: d.condition,
          gender: d.gender,
          color: d.color || null,
          price_pence: Math.round(d.price * 100),
          description: d.description || null,
          photos: photoUrls,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Your trainers are live ✨");
      navigate("/", { replace: true });
      // Future: navigate(`/listing/${row.id}`)
      void row;
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="container h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display font-bold text-xl tracking-tight">List your trainers</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="container max-w-2xl py-6 space-y-8">
        {/* PHOTOS */}
        <section>
          <h2 className="font-display font-semibold text-lg mb-1">Photos</h2>
          <p className="text-sm text-muted-foreground mb-3">
            Up to {MAX_PHOTOS}. First photo is your cover. Show all angles + any flaws.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-muted group">
                <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/90 flex items-center justify-center hover:bg-background"
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className={cn(
                "aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary hover:bg-primary-soft transition-colors"
              )}>
                <Camera className="h-6 w-6" />
                <span className="text-xs font-medium">Add photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    onAddPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </section>

        {/* TITLE */}
        <section className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="e.g. Air Max 90 'Cloud Grey'"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="h-11 rounded-xl"
            maxLength={80}
            required
          />
        </section>

        {/* BRAND + MODEL */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pick a brand" /></SelectTrigger>
              <SelectContent>
                {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="model"
              placeholder="e.g. Air Force 1 Low"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="h-11 rounded-xl"
              maxLength={60}
            />
          </div>
        </section>

        {/* SIZE + GENDER */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>UK size</Label>
            <Select
              value={form.size_uk === "" ? "" : String(form.size_uk)}
              onValueChange={(v) => setForm({ ...form, size_uk: Number(v) })}
            >
              <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Pick size" /></SelectTrigger>
              <SelectContent>
                {UK_SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    UK {s} <span className="text-muted-foreground">· EU {ukToEu(s)}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fit</Label>
            <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as typeof form.gender })}>
              <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* CONDITION */}
        <section className="space-y-2">
          <Label>Condition</Label>
          <div className="grid gap-2">
            {CONDITIONS.map((c) => {
              const active = form.condition === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setForm({ ...form, condition: c.value })}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <div>
                    <p className="font-semibold text-sm">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                  <div className={cn(
                    "h-5 w-5 rounded-full border-2 mt-0.5 shrink-0",
                    active ? "border-primary bg-primary" : "border-border"
                  )}>
                    {active && <div className="h-full w-full rounded-full ring-2 ring-primary-soft ring-inset" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* COLOR + PRICE */}
        <section className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Colour <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              id="color"
              placeholder="e.g. Cloud Grey"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-11 rounded-xl"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (£)</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">£</span>
              <Input
                id="price"
                type="number"
                min={1}
                max={10000}
                step="0.01"
                placeholder="65"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value === "" ? "" : Number(e.target.value) })}
                className="h-11 rounded-xl pl-8"
                required
              />
            </div>
          </div>
        </section>

        {/* DESCRIPTION */}
        <section className="space-y-2">
          <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            id="description"
            placeholder="Where you got them, how often worn, any flaws to mention…"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl min-h-32"
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground text-right">
            {form.description.length}/1000
          </p>
        </section>

        <Button
          type="submit"
          size="lg"
          className="w-full h-12 rounded-full font-semibold text-base"
          disabled={submitting}
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Posting…</>
          ) : (
            "Post listing"
          )}
        </Button>
      </form>
    </div>
  );
};

export default Sell;
