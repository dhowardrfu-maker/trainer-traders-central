import { useEffect, useState } from "react";
import { resolvePhotoUrl, resolvePhotoUrls } from "@/lib/photo";

export function useSignedPhoto(pathOrUrl: string | undefined | null): string {
  const [url, setUrl] = useState<string>(pathOrUrl && /^(https?:|data:|blob:|\/)/.test(pathOrUrl) ? pathOrUrl : "");
  useEffect(() => {
    let cancelled = false;
    resolvePhotoUrl(pathOrUrl).then((u) => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [pathOrUrl]);
  return url;
}

export function useSignedPhotos(paths: (string | undefined | null)[]): string[] {
  const key = paths.join("|");
  const [urls, setUrls] = useState<string[]>(() =>
    paths.map((p) => (p && /^(https?:|data:|blob:|\/)/.test(p) ? p : ""))
  );
  useEffect(() => {
    let cancelled = false;
    resolvePhotoUrls(paths).then((u) => { if (!cancelled) setUrls(u); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}
