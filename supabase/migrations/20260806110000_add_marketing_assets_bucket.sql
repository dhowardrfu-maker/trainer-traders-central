-- Public bucket for marketing images (email headers, social posts) that
-- need a stable public URL. Read-only to everyone; only admins can upload,
-- since anything in here gets embedded in outbound emails.
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Marketing assets are publicly readable" ON storage.objects;
CREATE POLICY "Marketing assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing-assets');

DROP POLICY IF EXISTS "Admins can upload marketing assets" ON storage.objects;
CREATE POLICY "Admins can upload marketing assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketing-assets' AND public.is_profile_admin(auth.uid()));
