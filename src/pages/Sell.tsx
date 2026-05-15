import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ukToEu, BRANDS, CONDITIONS, GENDERS, UK_SIZES } from "@/data/listing-options";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  title: z.string().min(3, "Title required"),
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
  const { user, loading } = useAuth();

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    size_uk: "" as number | "",
    condition: "",
    gender: "unisex",
    color: "",
    price: "" as number | "",
    description: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
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

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user) throw new Error("Not signed in");

    const paths: string[] = [];

    for (const file of photos) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (upErr) {
        console.error("[Sell] upload error", upErr);
        throw new Error(`Photo upload failed: ${upErr.message}`);
      }

      // Short-lived signed URL just for the moderation edge function
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrl(path, 300);

      if (signed?.signedUrl) {
        try {
          const { data: mod } = await supabase.functions.invoke("moderate-image", {
            body: { imageUrl: signed.signedUrl },
          });
          if (mod && mod.allowed === false) {
            await supabase.storage.from("listing-photos").remove([path]);
            throw new Error(
              `Photo rejected by moderation${mod.reason ? `: ${mod.reason}` : ""}`
            );
          }
        } catch (modErr) {
          if (modErr instanceof Error && modErr.message.startsWith("Photo rejected")) {
            throw modErr;
          }
          console.warn("[Sell] moderation skipped", modErr);
        }
      }

      paths.push(path);
    }

    return paths;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (photos.length === 0) {
      toast.error("Add at least one photo");
      return;
    }

    const cleaned = {
      title: form.title.trim(),
      brand: form.brand,
      model: form.model.trim() || undefined,
      size_uk: typeof form.size_uk === "number" ? Number(form.size_uk) : undefined,
      condition: form.condition,
      gender: form.gender,
      color: form.color.trim() || undefined,
      price: typeof form.price === "number" ? Number(form.price) : undefined,
      description: form.description.trim() || undefined,
    };

    const parsed = schema.safeParse(cleaned);

    if (!parsed.success) {
      console.log(parsed.error.issues);
      toast.error(parsed.error.issues.map((i) => i.message).join(", "));
      return;
    }

    setSubmitting(true);

    try {
      const photoUrls = await uploadPhotos();
      const d = parsed.data;

      // 🔥 FINAL TYPE-SAFE FIX
      const sizeUk = Number(d.size_uk);
      const sizeEu = Number(ukToEu(sizeUk));
      const pricePence = Math.round(Number(d.price) * 100);

      const { error } = await supabase.from("listings").insert({
        seller_id: user.id,
        title: d.title,
        brand: d.brand,
        model: d.model || null,
        size_uk: sizeUk,
        size_eu: sizeEu,
        condition: d.condition,
        gender: d.gender,
        color: d.color || null,
        price_pence: pricePence,
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

      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
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
              <img src={src} className="w-full h-full object-cover rounded-xl" />
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
        <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            {BRANDS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* MODEL */}
        <Input
          placeholder="Model (optional)"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
        />

        {/* SIZE */}
        <Select
          value={form.size_uk ? String(form.size_uk) : ""}
          onValueChange={(v) => setForm({ ...form, size_uk: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue placeholder="UK Size" />
          </SelectTrigger>
          <SelectContent>
            {UK_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                UK {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* CONDITION */}
        <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* GENDER */}
        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* COLOR */}
        <Input
          placeholder="Colour (optional)"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />

        {/* PRICE */}
        <Input
          type="number"
          placeholder="Price"
          value={form.price}
          onChange={(e) =>
            setForm({ ...form, price: Number(e.target.value) })
          }
        />

        {/* DESCRIPTION */}
        <Textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? <Loader2 className="animate-spin" /> : "Post listing"}
        </Button>
      </form>
    </div>
  );
};

export default Sell;
