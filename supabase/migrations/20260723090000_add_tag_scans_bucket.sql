-- Private storage bucket for tag-scanner uploads. These are throwaway
-- diagnostic photos (not listing photos), so unlike listing-photos this
-- bucket is private and objects are deleted client-side right after a scan.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tag-scans', 'tag-scans', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owners can insert their own tag scans" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'tag-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can read their own tag scans" ON storage.objects
FOR SELECT USING (
  bucket_id = 'tag-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete their own tag scans" ON storage.objects
FOR DELETE USING (
  bucket_id = 'tag-scans'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
