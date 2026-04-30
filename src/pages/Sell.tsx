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
const MAX_FILE_BYTES = 5 * 1024 * 1024;

// FIXED schema (no empty-string crashes)
const schema = z.object({
  title: z.string().min(3, "Title required").max(80),
  brand: z.string().min(1, "Brand required"),
  model: z.string().optional(),
  size_uk: z.number().min(1, "Size required"),
  condition: z.enum(["new_with_tags", "like_new", "very_good", "good", "worn"]),
  gender: z.enum(["mens", "womens", "unisex", "kids"]),
  color: z.string().optional(),
  price: z.number().min(1, "Price required"),
  description: z.string().optional(),
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
    condition: "" as any,
    gender: "unisex" as any,
    color: "",
    price: "" as number | "",
    description: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  const onAddPhotos = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_FILE_BYTES) return false;
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
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("listing-photos")
        .upload(path, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from("listing-photos")
        .getPublicUrl(path);

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

    // CLEAN DATA BEFORE ZOD
    const cleaned = {
      title: form.title.trim(),
      brand: form.brand,
      model: form.model.trim() || undefined,
      size_uk: typeof form.size_uk === "number" ? form.size_uk : undefined,
      condition: form.condition || undefined,
      gender: form.gender,
      color: form.color.trim() || undefined,
      price: typeof form.price === "number" ? form.price : undefined,
      description: form.description.trim() || undefined,
    };

    const parsed = schema.safeParse(cleaned);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const photoUrls = await uploadAllPhotos();

      const d = parsed.data;

      const { error } = await supabase.from("listings").insert({
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
      });

      if (error) throw error;

      toast.success("Listing posted ✨");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="container h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h1 className="font-bold text-xl">List your trainers</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="container max-w-2xl py-6 space-y-6">

        {/* PHOTOS */}
        <div className="grid grid-cols-3 gap-3">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square">
              <img src={src} className="object-cover w-full h-full rounded-xl" />
              <button type="button" onClick={() => removePhoto(i)}>
                <X />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label className="border rounded-xl flex items-center justify-center">
              <Camera />
              <input type="file" hidden multiple onChange={(e) => onAddPhotos(e.target.files)} />
            </label>
          )}
        </div>

        {/* TITLE */}
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        {/* BRAND */}
        <Select onValueChange={(v) => setForm({ ...form, brand: v })}>
          <SelectTrigger><SelectValue placeholder="Brand" /></SelectTrigger>
          <SelectContent>
            {BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* PRICE */}
        <Input
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={(e) =>
            setForm({ ...form, price: Number(e.target.value) })
          }
        />

        <Button disabled={submitting}>
          {submitting ? <Loader2 /> : "Post listing"}
        </Button>
      </form>
    </div>
  );
};

export default Sell;
