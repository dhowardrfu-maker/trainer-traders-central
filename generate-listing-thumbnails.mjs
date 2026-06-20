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
 *   4. NEVER overwrites or deletes anything. If a thumbnail already exists
 *      for a photo, it's skipped — safe to re-run this script any time.
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
 * The service role key is required to read every listing regardless of RLS
 * policies, and to read/write Storage. Never expose this key client-side —
 * run this only as a local/admin script.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "listing-photos";
const THUMB_WIDTH = 400;
const THUMB_WEBP_QUALITY = 70;

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
    upsert: false, // refuses to overwrite — if a thumbnail already exists, this fails loudly and we treat it as "already done"
  });

  if (upErr) {
    if (upErr.message?.toLowerCase().includes("already exists")) {
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
