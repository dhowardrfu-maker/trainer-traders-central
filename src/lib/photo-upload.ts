import imageCompression from "browser-image-compression";
import { supabase } from "@/integrations/supabase/client";
import { toThumbPath } from "@/lib/photo";

/**
 * Photo filenames are UUIDs and are never overwritten, so the bytes at a
 * given URL can never change. Caching them for a year keeps repeat views
 * out of the Supabase egress allowance entirely (browser cache).
 */
export const PHOTO_CACHE_CONTROL = "31536000, immutable";

// Full-size target: what the listing detail page and lightbox load. Keeps
// photos sharp on screen while cutting raw camera uploads (3-4.5MB) down hard.
export const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

/**
 * Thumbnail target: what grid/card views load (homepage, search, browse).
 *
 * 640px covers the largest place a card is drawn on a high-DPR phone
 * screen without upscaling. The byte cap is what actually governs
 * sharpness -- too tight and the encoder keeps dropping quality to fit,
 * which smears busy photos (patterned backgrounds, laces, texture) even
 * at the right pixel dimensions. Previous target here (400px / 0.05MB)
 * was doing exactly that; there's plenty of headroom on the current
 * Supabase plan to raise it.
 */
export const THUMBNAIL_COMPRESSION_OPTIONS = {
  maxSizeMB: 0.13,
  maxWidthOrHeight: 640,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

/** Compress a raw file down to the full-size display target, as WebP. */
export async function compressForUpload(file: File): Promise<File> {
  const result = await imageCompression(file, COMPRESSION_OPTIONS);
  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([result], `${baseName}.webp`, { type: "image/webp" });
}

/**
 * Upload an already-compressed photo plus a card-sized thumbnail beside it.
 *
 * Pass the output of {@link compressForUpload} -- callers that compress at
 * file-selection time (for instant previews) can pass that file straight in
 * rather than re-encoding it here.
 *
 * Thumbnail generation is best-effort: if it fails the listing still works,
 * because grid views fall back to the full-size image for that photo.
 *
 * @returns the storage paths written, so callers can clean up on rejection.
 */
export async function uploadListingPhoto(
  fullSizeFile: File,
  userId: string
): Promise<{ path: string; thumbPath: string }> {
  const id = crypto.randomUUID();
  // Always .webp -- compressForUpload re-encodes to WebP, so deriving the
  // extension from the original filename would mislabel the object.
  const path = `${userId}/${id}.webp`;
  const thumbPath = toThumbPath(path);

  const { error: upErr } = await supabase.storage
    .from("listing-photos")
    .upload(path, fullSizeFile, {
      cacheControl: PHOTO_CACHE_CONTROL,
      upsert: false,
      contentType: "image/webp",
    });
  if (upErr) {
    console.error("[photo-upload] upload error", upErr);
    throw new Error(`Photo upload failed: ${upErr.message}`);
  }

  try {
    const thumbFile = await imageCompression(fullSizeFile, THUMBNAIL_COMPRESSION_OPTIONS);
    await supabase.storage.from("listing-photos").upload(thumbPath, thumbFile, {
      cacheControl: PHOTO_CACHE_CONTROL,
      upsert: false,
      contentType: "image/webp",
    });
  } catch (thumbErr) {
    console.warn(
      "[photo-upload] thumbnail generation/upload failed, grid will fall back to full image",
      thumbErr
    );
  }

  return { path, thumbPath };
}
