
-- Create storage bucket for service images
INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true);

-- Allow public read access
CREATE POLICY "Public can view service images"
ON storage.objects FOR SELECT
USING (bucket_id = 'service-images');

-- Allow admins to upload/update/delete
CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
USING (bucket_id = 'service-images' AND public.has_role(auth.uid(), 'admin'));
