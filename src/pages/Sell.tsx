import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Camera, Loader2, X } from "lucide-react";
import imageCompression from "browser-image-compression";
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

// Compression target: keeps listing photos sharp on screen while cutting
// upload size and storage/egress dramatically compared to raw camera photos
// (which were coming in at 3-4.5MB each).
const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

// Thumbnail target: small enough for grid/card views (homepage, search,
// category browse) where loading the full-size image and shrinking it with
// CSS wastes bandwidth on every page view.
const THUMBNAIL_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.05,
  maxWidthOrHeight: 400,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

const SIZE_OPTIONS = [
  { value: "small", label: "Small parcel — up to 2kg" },
  { value: "medium", label: "Medium parcel — up to 5kg" },
  { value: "large", label: "Large parcel — up to 10kg" },
  { value: "extra_large", label: "Extra large parcel — up to 15kg" },
];

const schema = z.object({
  title: z.string().min(3, "Title required"),
  brand: z.string().min(1, "Brand required"),
  model: z.string().optional(),
  size_uk: z.number().min(1, "Size required"),
  condition: z.enum(["new_with_tags", "like_new", "very_good", "good", "worn"]),
  gender: z.enum(["mens", "womens", "unisex", "kids"]),
  color: z.string().optional(),
  price: z.number().min(1, "Price required"),
  size_category: z.enum(["small", "medium", "large", "extra_large"], {
    errorMap: () => ({ message: "Parcel size required" }),
  }),
  description: z.string().optional(),
});

const Sell = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const dragIndex = useRef<number | null>(null);

  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    size_uk: "" as number | "",
    condition: "",
    gender: "unisex",
    color: "",
    price: "" as number | "",
    size_category: "",
    description: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [photos]);

  // Compress each photo client-side before it's added to state, so large
  // camera photos (often 3-4.5MB) never reach Storage at full size.
  const onAddPhotos = async (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).filter((f) => {
      if (!f.type.startsWith("image/")) return false;
      if (f.size > MAX_FILE_BYTES) return false;
      return true;
    });
    if (incoming.length === 0) return;

    setCompressing(true);
    try {
      const compressed = await Promise.all(
        incoming.map(async (file) => {
          try {
            const result = await imageCompression(file, COMPRESSION_OPTIONS);
            // Preserve a sensible filename with the new extension
            const baseName = file.name.replace(/\.[^.]+$/, "");
            return new File([result], `${baseName}.webp`, { type: "image/webp" });
          } catch (err) {
            console.warn("[Sell] compression failed, using original file", err);
            return file;
          }
        })
      );
      setPhotos((prev) => [...prev, ...compressed].slice(0, MAX_PHOTOS));
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = (idx: number) =>
    setPhotos((prev) => prev.filter((_, i) => i !== idx));

  // Drag-to-reorder, same pattern used on the Edit listing page — dragging a
  // photo over another swaps its position in the `photos` array; `previews`
  // re-derives automatically from `photos` via the effect above.
  const onDragStart = (i: number) => { dragIndex.current = i; };
  const onDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === i) return;
    setPhotos((prev) => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(i, 0, item);
      return arr;
    });
    dragIndex.current = i;
  };
  const onDragEnd = () => { dragIndex.current = null; };

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user) throw new Error("Not signed in");
    const paths: string[] = [];
    for (const file of photos) {
      const ext = (file.name.split(".").pop() || "webp").toLowerCase();
      const id = crypto.randomUUID();
      const path = `${user.id}/${id}.${ext}`;
      const thumbPath = `${user.id}/${id}-thumb.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("listing-photos")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/webp",
        });
      if (upErr) {
        console.error("[Sell] upload error", upErr);
        throw new Error(`Photo upload failed: ${upErr.message}`);
      }

      // Generate and upload a small thumbnail for grid/card views.
      // Best-effort: if this fails, the listing still works fine — grid
      // views simply fall back to the full-size image for this one photo.
      try {
        const thumbFile = await imageCompression(file, THUMBNAIL_COMPRESSION_OPTIONS);
        await supabase.storage
          .from("listing-photos")
          .upload(thumbPath, thumbFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: "image/webp",
          });
      } catch (thumbErr) {
        console.warn("[Sell] thumbnail generation/upload failed, grid will fall back to full image", thumbErr);
      }

      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrl(path, 300);
      if (signed?.signedUrl) {
        try {
          const { data: mod } = await supabase.functions.invoke("moderate-image", {
            body: { imageUrl: signed.signedUrl },
          });
          if (mod && mod.allowed === false) {
            await supabase.storage.from("listing-photos").remove([path, thumbPath]);
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
      size_category: form.size_category,
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
        size_category: d.size_category,
        description: d.description || null,
        photos: photoUrls as unknown as string,
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
        {previews.length > 1 && (
          <p className="text-xs text-muted-foreground">Drag to reorder · First photo is the cover</p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {previews.map((src, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOver(e, i)}
              onDragEnd={onDragEnd}
              className="relative aspect-square cursor-grab active:cursor-grabbing select-none"
            >
              <img src={src} className="w-full h-full object-cover rounded-xl pointer-events-none" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-semibold">
                  Cover
                </span>
              )}
              <button type="button" onClick={() => removePhoto(i)}>
                <X />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className="border rounded-xl flex items-center justify-center aspect-square">
              {compressing ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Camera />
              )}
              <input
                type="file"
                hidden
                multiple
                accept="image/*"
                disabled={compressing}
                onChange={(e) => onAddPhotos(e.target.files)}
              />
            </label>
          )}
        </div>
        {compressing && (
          <p className="text-xs text-muted-foreground -mt-4">Optimising photos…</p>
        )}

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
          placeholder="Price (£)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />

        {/* PARCEL SIZE */}
        <Select
          value={form.size_category}
          onValueChange={(v) => setForm({ ...form, size_category: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select parcel size" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground -mt-4">
          The buyer will choose their preferred delivery carrier and pay postage at checkout.
        </p>

        {/* DESCRIPTION */}
        <Textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <Button type="submit" disabled={submitting || compressing} className="w-full">
          {submitting ? <Loader2 className="animate-spin" /> : "Post listing"}
        </Button>
      </form>
    </div>
  );
};

export default Sell;