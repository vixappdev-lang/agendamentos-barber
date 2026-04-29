-- Policies de admin para o bucket public-assets (galeria, hero, logo, etc)
CREATE POLICY "Admins can upload to public-assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update public-assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete public-assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-assets' AND public.has_role(auth.uid(), 'admin'));