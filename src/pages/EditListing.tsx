import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useSEO } from "@/hooks/useSEO";

const EditListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  useSEO({ title: "Edit listing · PrelovedKicks" });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "" as number | "",
    postage: "" as number | "",
    color: "",
    status: "active" as "active" | "draft" | "sold" | "removed",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      if (!id || !user) return;
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("id", Number(id))
        .maybeSingle();
      if (error || !data) {
        toast.error("Listing not found");
        navigate("/profile");
        return;
      }
      if (data.seller_id !== user.id) {
        toast.error("You can only edit your own listings");
        navigate("/profile");
        return;
      }
      setForm({
        title: data.title,
        description: data.description ?? "",
        price: data.price_pence / 100,
        postage: data.postage_pence / 100,
        color: data.color ?? "",
        status: (data.status ?? "active") as "active" | "draft" | "sold" | "removed",
      });
      const rawPhotos = data.photos;
      const parsedPhotos = Array.isArray(rawPhotos)
        ? rawPhotos
        : typeof rawPhotos === "string"
          ? (() => { try { return JSON.parse(rawPhotos); } catch { return []; } })()
          : [];
      setPhotos(parsedPhotos as string[]);
      setLoading(false);
    })();
  }, [id, user, navigate]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length || !user) return;
    if (photos.length + files.length > 8) {
      toast.error("Maximum 8 photos allowed");
      return;
    }
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("listing-photos").upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("listing-photos").getPublicUrl(path);
      uploaded.push(urlData.publicUrl);
    }
    setPhotos((prev) => [...prev, ...uploaded]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const onSave = async () => {
    if (!id) return;
    if (!form.title.trim() || !form.price || Number(form.price) <= 0) {
      toast.error("Title and price are required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("listings")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        price_pence: Math.round(Number(form.price) * 100),
        postage_pence: Math.round(Number(form.postage) * 100),
        color: form.color.trim() || null,
        status: form.status,
        photos: JSON.stringify(photos),
      })
      .eq("id", Number(id));
    setSaving(false);
    if (error) {
      toast.error("Couldn't save changes");
      return;
    }
    toast.success("Listing updated");
    navigate(`/listing/${id}`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold">Edit listing</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-xl space-y-5">

        {/* Photos */}
        <div className="space-y-2">
          <Label>Photos</Label>
          <div className="grid grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-muted">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 8 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-[10px]">Add photo</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <p className="text-xs text-muted-foreground">{photos.length}/8 photos</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="price">Price (£)</Label>
          <Input
            id="price"
            type="number"
            min={1}
            step="0.01"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postage">Postage cost (£)</Label>
          <Input
            id="postage"
            type="number"
            min={0}
            step="0.01"
            value={form.postage}
            onChange={(e) => setForm({ ...form, postage: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">Colour</Label>
          <Input id="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft (hidden)</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button asChild variant="outline" className="rounded-full flex-1">
            <Link to={`/listing/${id}`}>Cancel</Link>
          </Button>
          <Button onClick={onSave} disabled={saving} className="rounded-full flex-1 font-semibold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default EditListing;