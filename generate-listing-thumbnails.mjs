#!/usr/bin/env node
/**
 * generate-listing-thumbnails.mjs
 *
 * Backfills small thumbnail images for every existing listing photo, so
 * grid/card views (homepage, search, category browse) can load a small
 * image instead of the full-size photo shrunk down with CSS.
 *
 * What it does:
 *   1. Reads every listing from the `listings` table (all sellers, all
 *      statuses — uses the service role key to bypass RLS).
 *   2. For each photo path, generates a small webp thumbnail using the same
 *      target size the app's own upload flow uses (Sell.tsx). Applies the
 *      photo's EXIF orientation first, so rotated phone photos display
 *      the right way up.
 *   3. Uploads the thumbnail as a NEW object, named by inserting "-thumb"
 *      before the file extension — e.g. "userId/abc123.webp" becomes
 *      "userId/abc123-thumb.webp". This matches exactly what the app's
 *      photo-resolving code expects to find.
 *   4. By default, skips any photo that already has a thumbnail — safe to
 *      re-run any time to backfill new photos. Pass FORCE=true to
 *      overwrite existing thumbnails too (e.g. after raising THUMB_WIDTH /
 *      THUMB_WEBP_QUALITY below, to regenerate everyone's existing
 *      thumbnails at the new, better quality).
 *
 * Unlike the photo-recompression script, this does NOT require any
 * follow-up database step — thumbnails are found automatically by their
 * filename at read-time, nothing in `listings.photos` ever changes.
 *
 * Setup:
 *   npm install @supabase/supabase-js sharp
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxxx \
 *   node generate-listing-thumbnails.mjs
 *
 * To regenerate existing thumbnails at the current quality settings:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxxx \
 *   FORCE=true node generate-listing-thumbnails.mjs
 *
 * The service role key is required to read every listing regardless of RLS
 * policies, and to read/write Storage. Never expose this key client-side —
 * run this only as a local/admin script.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "listing-photos";
// 400px / quality 70 was forcing the encoder to smear detail on busy photos
// to hit the byte budget implied by such a low quality setting at that
// resolution. Raised with plenty of headroom on the current Supabase plan
// (storage/egress both under 15% of the free tier caps).
const THUMB_WIDTH = 640;
const THUMB_WEBP_QUALITY = 82;
const FORCE = process.env.FORCE === "true";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const isFullUrl = (s) => /^(https?:|data:|blob:)/.test(s);

const toThumbPath = (path) => {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return null;
  return `${path.slice(0, lastDot)}-thumb${path.slice(lastDot)}`;
};

const parsePhotos = (raw) => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

async function processPhoto(path) {
  if (isFullUrl(path)) {
    console.log(`  skip (external URL, not a storage path): ${path}`);
    return "skipped";
  }

  const thumbPath = toThumbPath(path);
  if (!thumbPath) {
    console.log(`  skip (no file extension found): ${path}`);
    return "skipped";
  }

  const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(path);
  if (dlErr) {
    console.error(`  skip (original not found in storage): ${path} — ${dlErr.message}`);
    return "error";
  }

  const inputBuffer = Buffer.from(await blob.arrayBuffer());

  let outputBuffer;
  try {
    outputBuffer = await sharp(inputBuffer)
      .rotate() // applies the photo's EXIF orientation before resizing, so rotated phone photos display correctly
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .webp({ quality: THUMB_WEBP_QUALITY })
      .toBuffer();
  } catch (sharpErr) {
    console.error(`  skip (thumbnail generation failed): ${path} — ${sharpErr.message}`);
    return "error";
  }

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(thumbPath, outputBuffer, {
    contentType: "image/webp",
    // Filenames are permanent random IDs -- editing a listing uploads a NEW
    // file rather than overwriting this one, so it's safe to tell browsers
    // and Supabase's CDN to cache this for a year and never re-check.
    // Repeat views (same visitor revisiting, or a popular listing loaded by
    // many visitors) then cost little to no egress instead of re-downloading
    // the same bytes every time.
    cacheControl: "31536000, immutable",
    upsert: FORCE, // FORCE=true overwrites an existing thumbnail (e.g. to apply new quality settings); otherwise refuses to overwrite
  });

  if (upErr) {
    if (!FORCE && upErr.message?.toLowerCase().includes("already exists")) {
      console.log(`  already has a thumbnail, skipping: ${path}`);
      return "already_exists";
    }
    console.error(`  upload failed: ${path} — ${upErr.message}`);
    return "error";
  }

  console.log(`  -> ${thumbPath} (${(outputBuffer.length / 1024).toFixed(0)}KB)`);
  return "created";
}

async function main() {
  const { data: listings, error } = await supabase.from("listings").select("id, photos");
  if (error) throw error;

  console.log(`Found ${listings.length} listing(s) to process.\n`);

  const counts = { created: 0, already_exists: 0, skipped: 0, error: 0 };

  for (const listing of listings) {
    const photos = parsePhotos(listing.photos);
    if (photos.length === 0) continue;

    console.log(`Listing ${listing.id} (${photos.length} photo(s)):`);
    for (const path of photos) {
      const result = await processPhoto(path);
      counts[result] = (counts[result] ?? 0) + 1;
    }
  }

  console.log("\nDone.");
  console.log(`  Created: ${counts.created}`);
  console.log(`  Already existed: ${counts.already_exists}`);
  console.log(`  Skipped: ${counts.skipped}`);
  console.log(`  Errors: ${counts.error}`);
  console.log("\nNo database changes were made — thumbnails are found automatically by filename.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
