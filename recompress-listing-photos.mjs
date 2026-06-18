#!/usr/bin/env node
/**
 * recompress-listing-photos.mjs
 *
 * SAFE photo recompression for a Supabase Storage bucket.
 *
 * What it does:
 *   1. Lists every object under a given folder prefix (e.g. one seller's
 *      upload folder) in the `listing-photos` bucket.
 *   2. Downloads any file over a size threshold.
 *   3. Resizes/recompresses it to webp using the SAME target the app's own
 *      upload flow uses (max 1600px wide, quality tuned for ~small files).
 *   4. Uploads the result as a NEW object path — it NEVER overwrites or
 *      deletes the original file.
 *   5. Writes a JSON mapping of old path -> new path so you can open and
 *      eyeball the new images yourself before touching the database.
 *
 * This script does not delete anything and does not modify your `listings`
 * table. Run it, check the new images look right (open their public URLs),
 * THEN use the SQL given alongside this script to repoint the `photos`
 * column — as a separate, reviewable, transaction-wrapped step.
 *
 * Setup:
 *   npm install @supabase/supabase-js sharp
 *
 * Usage:
 *   SUPABASE_URL=https://xxxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=xxxx \
 *   node recompress-listing-photos.mjs <folder-prefix> [maxBytesThreshold]
 *
 * Example (the seller folder identified from the Logs Explorer results):
 *   node recompress-listing-photos.mjs 4f36cfe7-a4a6-4393-bed8-03f8d3bdede3/ 600000
 *
 * The service role key is required because it can read/write Storage
 * regardless of RLS policies. Never expose this key client-side — run this
 * only as a local/admin script.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const BUCKET = "listing-photos";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 78;
const DEFAULT_THRESHOLD_BYTES = 600_000; // ~600KB — anything bigger gets recompressed

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const prefix = process.argv[2];
const threshold = Number(process.argv[3] ?? DEFAULT_THRESHOLD_BYTES);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.");
  process.exit(1);
}
if (!prefix) {
  console.error("Usage: node recompress-listing-photos.mjs <folder-prefix> [maxBytesThreshold]");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  const { data: files, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw error;

  if (!files || files.length === 0) {
    console.log(`No files found under prefix "${prefix}" in bucket "${BUCKET}".`);
    return;
  }

  const mapping = [];

  for (const file of files) {
    if (!file.name) continue;
    const fullPath = `${prefix}${file.name}`;
    const size = file.metadata?.size;

    if (size == null) {
      console.log(`skip (no size metadata, probably a folder marker): ${fullPath}`);
      continue;
    }

    if (size <= threshold) {
      console.log(`skip (already small, ${(size / 1024).toFixed(0)}KB): ${fullPath}`);
      continue;
    }

    console.log(`processing (${(size / 1024 / 1024).toFixed(2)}MB): ${fullPath}`);

    const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(fullPath);
    if (dlErr) {
      console.error(`  download failed: ${dlErr.message}`);
      continue;
    }

    const inputBuffer = Buffer.from(await blob.arrayBuffer());

    let outputBuffer;
    try {
      outputBuffer = await sharp(inputBuffer)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
    } catch (sharpErr) {
      console.error(`  recompression failed (skipping, original untouched): ${sharpErr.message}`);
      continue;
    }

    const newPath = fullPath.replace(/\.[^./]+$/, "") + "-recompressed.webp";

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, outputBuffer, {
      contentType: "image/webp",
      upsert: false, // refuses to overwrite — extra safety, fails loudly if path already exists
    });
    if (upErr) {
      console.error(`  upload failed (original untouched): ${upErr.message}`);
      continue;
    }

    const savedPct = (100 * (1 - outputBuffer.length / size)).toFixed(0);
    console.log(`  -> ${newPath} (${(outputBuffer.length / 1024).toFixed(0)}KB, ${savedPct}% smaller)`);

    mapping.push({
      old_path: fullPath,
      new_path: newPath,
      old_bytes: size,
      new_bytes: outputBuffer.length,
    });
  }

  const outFile = "photo-recompression-mapping.json";
  writeFileSync(outFile, JSON.stringify(mapping, null, 2));

  console.log(`\nDone. ${mapping.length} replacement candidate(s) written to ${outFile}.`);
  console.log("Originals were NOT deleted or modified — both old and new files exist in Storage.");
  console.log("Next: open the new_path URLs to confirm they look right, then use the SQL");
  console.log("provided alongside this script to repoint `listings.photos` to the new paths.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});