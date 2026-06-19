import { supabase } from "@/integrations/supabase/client";

const isFullUrl = (s: string) => /^(https?:|data:|blob:|\/)/.test(s);

/**
 * Given a storage path like "userId/listingId/abc123.webp", returns the
 * thumbnail variant's path: "userId/listingId/abc123-thumb.webp".
 * Used for grid/card contexts where a small image is enough, instead of
 * loading the full-size photo and shrinking it with CSS.
 */
const toThumbPath = (path: string): string => {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return path; // no extension found, can't safely derive a thumb name
  return `${path.slice(0, lastDot)}-thumb${path.slice(lastDot)}`;
};

/**
 * Resolve a stored value (storage path or full URL) to a displayable URL.
 * The listing-photos bucket is public so we use getPublicUrl (no signing needed).
 * JSON arrays are parsed and the first URL is returned.
 *
 * @param thumbnail - if true, resolves to the small thumbnail variant instead
 * of the full-size image. Falls back to the full-size path if the value is
 * a full external URL (thumbnails only exist for our own storage paths).
 */
export async function resolvePhotoUrl(
  pathOrUrl: string | undefined | null,
  thumbnail = false
): Promise<string> {
  if (!pathOrUrl) return "";

  // If it's a JSON array string, parse it and use the first element
  const trimmed = pathOrUrl.trim();
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr) && arr.length > 0) {
        return resolvePhotoUrl(arr[0], thumbnail);
      }
    } catch {
      // fall through
    }
    return "";
  }

  if (isFullUrl(pathOrUrl)) return pathOrUrl;

  const resolvedPath = thumbnail ? toThumbPath(pathOrUrl) : pathOrUrl;

  // Use public URL — no signing required for public buckets
  const { data } = supabase.storage
    .from("listing-photos")
    .getPublicUrl(resolvedPath);

  return data.publicUrl ?? "";
}

export async function resolvePhotoUrls(
  paths: (string | undefined | null)[],
  thumbnail = false
): Promise<string[]> {
  return Promise.all(paths.map((p) => resolvePhotoUrl(p, thumbnail)));
}