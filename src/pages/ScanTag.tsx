import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { BRANDS } from "@/data/listing-options";
import { checkFactoryCode, type TagCheckResult } from "@/lib/tagCheck";

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

interface ScanResponse {
  readable: boolean;
  styleCode?: string | null;
  factoryCode?: string | null;
  statedCountry?: string | null;
  confidence?: string;
  error?: string;
}

const ScanTag = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [brand, setBrand] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [check, setCheck] = useState<TagCheckResult | null>(null);
  const [scanningEnabled, setScanningEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase.from("profiles").select("scanning_enabled").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const enabled = data?.scanning_enabled === true;
        setScanningEnabled(enabled);
        if (!enabled) navigate("/profile?tab=account", { replace: true });
      });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const onPickPhoto = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setScan(null);
    setCheck(null);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS);
      setPhoto(new File([compressed], "tag.webp", { type: "image/webp" }));
    } catch (err) {
      console.error("[ScanTag] compression failed", err);
      toast.error("Couldn't process that photo — try another");
    }
  };

  const runScan = async () => {
    if (!user || !photo) return;
    if (!brand) { toast.error("Select a brand first"); return; }
    setScanning(true);
    setScan(null);
    setCheck(null);

    const path = `${user.id}/${crypto.randomUUID()}.webp`;
    try {
      const { error: upErr } = await supabase.storage
        .from("tag-scans")
        .upload(path, photo, { cacheControl: "60", upsert: false, contentType: "image/webp" });
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
      setScan(result);
      if (result.readable) {
        setCheck(checkFactoryCode({
          brand,
          factoryCode: result.factoryCode ?? null,
          statedCountry: result.statedCountry ?? null,
        }));
      }
    } catch (err) {
      console.error("[ScanTag] scan failed", err);
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      // Nothing persists — this was only ever needed for the one read.
      await supabase.storage.from("tag-scans").remove([path]);
      setScanning(false);
    }
  };

  const reset = () => {
    setPhoto(null);
    setScan(null);
    setCheck(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b">
        <div className="container h-16 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft />
          </Button>
          <h1 className="font-bold text-xl">Scan a tag</h1>
        </div>
      </header>

      <div className="container max-w-2xl py-6 space-y-6">
        <p className="text-sm text-muted-foreground">
          Photograph the inside tag of a Nike pair and we'll check its factory code against
          where the tag says it was made — one signal among several, never proof on its own.
        </p>

        <Select value={brand} onValueChange={setBrand}>
          <SelectTrigger>
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            {BRANDS.map((b) => (
              <SelectItem key={b} value={b}>{b}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {preview ? (
          <div className="relative aspect-square max-w-xs mx-auto rounded-xl overflow-hidden border">
            <img src={preview} alt="Tag to scan" className="w-full h-full object-cover" />
          </div>
        ) : (
          <label className="border rounded-xl flex flex-col items-center justify-center gap-2 aspect-square max-w-xs mx-auto cursor-pointer text-muted-foreground">
            <Camera />
            <span className="text-xs">Add a photo of the tag</span>
            <input type="file" hidden accept="image/*" onChange={(e) => onPickPhoto(e.target.files)} />
          </label>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={!photo || !brand || scanning} onClick={runScan}>
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scan tag"}
          </Button>
          {(photo || scan) && (
            <Button variant="outline" onClick={reset} disabled={scanning}>Retry</Button>
          )}
        </div>

        {scan && !scan.readable && (
          <Card className="p-4 rounded-2xl flex items-start gap-3">
            <ShieldQuestion className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Couldn't read this tag clearly</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try again with a closer, well-lit, in-focus photo of the printed code and
                "Made in" line.
              </p>
            </div>
          </Card>
        )}

        {scan?.readable && check && (
          <Card className="p-4 rounded-2xl space-y-3">
            <div className="text-sm space-y-1">
              {scan.styleCode && <p><span className="text-muted-foreground">Style code:</span> {scan.styleCode}</p>}
              {scan.factoryCode && <p><span className="text-muted-foreground">Factory code:</span> {scan.factoryCode}</p>}
              {scan.statedCountry && <p><span className="text-muted-foreground">Tag says made in:</span> {scan.statedCountry}</p>}
            </div>

            <div
              className={
                check.verdict === "mismatch"
                  ? "flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3"
                  : "flex items-start gap-3 rounded-xl border p-3"
              }
            >
              {check.verdict === "match" && <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
              {check.verdict === "mismatch" && <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
              {(check.verdict === "unsupported_brand" || check.verdict === "unrecognized_code" || check.verdict === "insufficient_data") && (
                <ShieldQuestion className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{check.summary}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              One signal among several — never proof of authenticity.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanTag;
