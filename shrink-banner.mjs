// shrink-banner.mjs
// Recompresses public-assets/Website Banner.png (the default OG/social-share image)
// the same way recompress-listing-photos.mjs handled the listing photos:
// download original -> recompress to webp -> upload as a NEW file -> original untouched.
//
// Usage (PowerShell):
//   $env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
//   node shrink-banner.mjs
//
// Requires `sharp` and `@supabase/supabase-js` — same deps as recompress-listing-photos.mjs.
// If you've already run the cleanup step (git checkout -- package.json) by the time you
// run this, you'll need `npm install sharp @supabase/supabase-js` again first.

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jwvybofahjxtldjjjdpo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  console.error('PowerShell: $env:SUPABASE_SERVICE_ROLE_KEY = "your-key-here"');
  process.exit(1);
}

const BUCKET = 'public-assets';
// Storage path is the literal filename (with a real space) — the %20 only shows up
// in URL-encoded form when it's served over HTTP.
const SOURCE_PATH = 'Website Banner.png';
const DEST_PATH = 'Website Banner-recompressed.webp';
const MAX_WIDTH = 1600; // matches the app's existing compression standard
const QUALITY = 78;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log(`Downloading ${BUCKET}/${SOURCE_PATH} ...`);
  const { data, error } = await supabase.storage.from(BUCKET).download(SOURCE_PATH);
  if (error) throw error;

  const inputBuffer = Buffer.from(await data.arrayBuffer());
  console.log(`Original size: ${(inputBuffer.length / 1024).toFixed(0)} KB`);

  const outputBuffer = await sharp(inputBuffer)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();

  const pctSmaller = (100 * (1 - outputBuffer.length / inputBuffer.length)).toFixed(1);
  console.log(`Recompressed size: ${(outputBuffer.length / 1024).toFixed(0)} KB (${pctSmaller}% smaller)`);

  console.log(`Uploading as ${BUCKET}/${DEST_PATH} ...`);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(DEST_PATH, outputBuffer, { contentType: 'image/webp', upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(DEST_PATH);
  console.log('\nDone. New file (original left untouched):');
  console.log(publicUrlData.publicUrl);
  console.log('\nOpen that URL in a browser to confirm it renders before updating any references.');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
