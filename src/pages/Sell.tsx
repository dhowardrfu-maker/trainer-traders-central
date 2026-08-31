import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, Camera, Loader2, X, ShieldCheck, ShieldQuestion } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ukToEu, BRANDS, CONDITIONS, GENDERS, UK_SIZES } from "@/data/listing-options";
import { runTagCheck, type TagVerificationResult } from "@/lib/tagCheck";
import { COMPRESSION_OPTIONS, compressForUpload, uploadListingPhoto } from "@/lib/photo-upload";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

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
  retail_price: z.number().min(1).optional(),
  size_category: z.enum(["small", "medium", "large", "extra_large"], {
    errorMap: () => ({ message: "Parcel size required" }),
  }),
  description: z.string().optional(),
});

interface ScanResponse {
  readable: boolean;
  styleCode?: string | null;
  factoryCode?: string | null;
  statedCountry?: string | null;
  confidence?: string;
  productMatch?: { found: boolean; title: string | null; sourceUrl: string | null };
  error?: string;
}

const Sell = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // ---- Step 0: verify ----
  const [step, setStep] = useState<0 | 1>(0);
  const [tagPhoto, setTagPhoto] = useState<File | null>(null);
  const [tagPreview, setTagPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [checkResult, setCheckResult] = useState<TagVerificationResult | null>(null);
  const [scanAttempted, setScanAttempted] = useState(false);
  const [scanningEnabled, setScanningEnabled] = useState<boolean | null>(null);

  // ---- Step 1: existing listing form ----
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
    retail_price: "" as number | "",
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

  useEffect(() => {
    if (!tagPhoto) { setTagPreview(null); return; }
    const url = URL.createObjectURL(tagPhoto);
    setTagPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [tagPhoto]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from("profiles").select("scanning_enabled").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setScanningEnabled(data?.scanning_enabled === true); });
    return () => { cancelled = true; };
  }, [user]);

  const onPickTagPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setCheckResult(null);
    setScanAttempted(false);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      setTagPhoto(new File([compressed], "tag.webp", { type: "image/webp" }));
    } catch (err) {
      console.error("[Sell] tag photo compression failed", err);
      toast.error("Couldn't process that photo — try another");
    }
  };

  // Clean a raw search-result title (often has " | RetailerName" appended)
  // down to something usable as a model/title starting point.
  const cleanProductTitle = (raw: string) => raw.split("|")[0].trim();

  const runVerify = async () => {
    if (!user || !tagPhoto) return;
    if (!form.brand) { toast.error("Select a brand first"); return; }
    setScanning(true);
    setCheckResult(null);

    const path = `${user.id}/${crypto.randomUUID()}.webp`;
    try {
      const { error: upErr } = await supabase.storage
        .from("tag-scans")
        .upload(path, tagPhoto, { cacheControl: "60", upsert: false, contentType: "image/webp" });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

      const { data: signed, error: signErr } = await supabase.storage
        .from("tag-scans")
        .createSignedUrl(path, 300);
      if (signErr || !signed?.signedUrl) throw new Error("Couldn't prepare the photo for scanning");

      const { data, error: fnErr } = await supabase.functions.invoke("scan-tag", {
        body: { imageUrl: signed.signedUrl },
      });
      if (fnErr) throw new Error(fnErr.message);

      const result = data as ScanResponse;
      setScanAttempted(true);

      if (result.readable) {
        const check = runTagCheck({
          brand: form.brand,
          factoryCode: result.factoryCode ?? null,
          statedCountry: result.statedCountry ?? null,
          productMatch: result.productMatch ?? { found: false, title: null, sourceUrl: null },
        });
        setCheckResult(check);
        if (check.productTitle) {
          const cleaned = cleanProductTitle(check.productTitle);
          setForm((f) => ({
            ...f,
            model: f.model || cleaned,
            title: f.title || `${form.brand} ${cleaned}`.trim(),
          }));
        }
      } else {
        setCheckResult({ verified: false, productTitle: null, summary: "Couldn't read this tag clearly." });
      }
    } catch (err) {
      console.error("[Sell] verify failed", err);
      toast.error(err instanceof Error ? err.message : "Verification failed");
      setScanAttempted(true);
      setCheckResult({ verified: false, productTitle: null, summary: "Verification failed." });
    } finally {
      await supabase.storage.from("tag-scans").remove([path]);
      setScanning(false);
    }
  };

  const proceedToListing = () => setStep(1);

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
            return await compressForUpload(file);
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
      // Photos are already compressed at selection time (onAddPhotos), so
      // this re-encodes as-is; uploadListingPhoto handles both the
      // full-size upload and the grid-view thumbnail.
      const { path, thumbPath } = await uploadListingPhoto(file, user.id);

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
      retail_price: typeof form.retail_price === "number" ? Number(form.retail_price) : undefined,
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
      const retailPricePence = d.retail_price ? Math.round(Number(d.retail_price) * 100) : null;
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
        retail_price_pence: retailPricePence,
        size_category: d.size_category,
        description: d.description || null,
        photos: photoUrls as unknown as string,
        status: "active",
        tag_verified: checkResult?.verified ?? false,
      });
      if (error) throw error;
      toast.success("Listing posted");
      navigate("/");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 0) {
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

        <div className="container max-w-2xl py-6 space-y-6">
          {scanningEnabled ? (
            <>
              <div>
                <p className="font-semibold">Step 1 of 2 — Verify the tag</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Photograph the inside tag and we'll check the style code against trusted retailers,
                  pre-fill some listing details, and add a "Tag Verified" badge to your listing if it
                  checks out. Entirely optional — you can skip this and list normally.
                </p>
              </div>

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

              {tagPreview ? (
                <div className="relative aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border">
                  <img src={tagPreview} alt="Tag to verify" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="border rounded-xl flex flex-col items-center justify-center gap-2 aspect-square max-w-xs mx-auto cursor-pointer text-muted-foreground">
                  <Camera />
                  <span className="text-xs">Add a photo of the tag</span>
                  <input type="file" hidden accept="image/*" onChange={(e) => onPickTagPhoto(e.target.files)} />
                </label>
              )}

              {scanAttempted && checkResult && (
                <Card className="p-4 rounded-2xl flex items-start gap-3">
                  {checkResult.verified ? (
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <ShieldQuestion className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{checkResult.verified ? "Tag Verified" : "Not verified"}</p>
                    <p className="text-sm text-muted-foreground mt-1">{checkResult.summary}</p>
                  </div>
                </Card>
              )}

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={!tagPhoto || !form.brand || scanning}
                  onClick={runVerify}
                >
                  {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify tag"}
                </Button>
                <Button className="flex-1" onClick={proceedToListing}>
                  {scanAttempted ? "Continue" : "Skip, list without verifying"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="font-semibold">Verify the tag</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Scanning isn't active on your account yet. Activate it once from your profile for a
                  one-time £2.50 to check style codes against trusted retailers and add a Tag Verified
                  badge to your listings — or just skip it and list normally, no charge either way.
                </p>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline" onClick={() => navigate("/profile?tab=scanning")}>
                  Activate scanning — £2.50
                </Button>
                <Button className="flex-1" onClick={proceedToListing}>
                  Skip, list without verifying
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="container h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setStep(0)}>
            <ArrowLeft />
          </Button>
          <h1 className="font-bold text-xl">List your trainers</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="container max-w-2xl py-6 space-y-6">
        <p className="text-xs text-muted-foreground -mt-2">Step 2 of 2 — Listing details</p>

        {checkResult?.verified && (
          <p className="text-xs inline-flex items-center gap-1 text-primary font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" /> Tag Verified — this listing will show the badge
          </p>
        )}

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

        {/* RETAIL PRICE (optional, powers Deal Score) */}
        <div>
          <Input
            type="number"
            placeholder="Original retail price (£, optional)"
            value={form.retail_price}
            onChange={(e) => setForm({ ...form, retail_price: Number(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Adds a Deal Score to your listing showing buyers how much they're saving vs. retail.
          </p>
        </div>

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
