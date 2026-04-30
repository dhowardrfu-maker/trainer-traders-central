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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BRANDS,
  CONDITIONS,
  GENDERS,
  UK_SIZES,
  ukToEu,
} from "@/data/listing-options";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  title: z.string().trim().min(3).max(80),
  brand: z.string().min(1),
  model: z.string().trim().max(60).optional().or(z.literal("")),
  size_uk: z.number().min(1).max(20),
  condition: z.enum([
    "new_with_tags",
    "like_new",
    "very_good",
    "good",
    "worn",
  ]),
  gender: z.enum(["mens", "womens", "unisex", "kids"]),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  price: z.number().min(1).max(10000),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
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
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("listings") // ✅ FIXED BUCKET NAME
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("listings")
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
      navigate("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error uploading");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="container flex items-center h-16 gap-3 border-b">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
        <h1 className="font-bold text-xl">List your trainers</h1>
      </header>

      <form onSubmit={handleSubmit} className="container max-w-2xl space-y-6 py-6">
        <section>
          <h2 className="font-semibold mb-2">Photos</h2>

          <div className="grid grid-cols-3 gap-3">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square">
                <img src={src} className="w-full h-full object-cover rounded-xl" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1"
                >
                  <X />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <label className="border-dashed border rounded-xl flex items-center justify-center cursor-pointer">
                <Camera />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onAddPhotos(e.target.files)}
                />
              </label>
            )}
          </div>
        </section>

        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />

        <Button disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : "Post listing"}
        </Button>
      </form>
    </div>
  );
};

export default Sell;
