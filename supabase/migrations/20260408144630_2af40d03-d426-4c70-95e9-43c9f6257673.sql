INSERT INTO storage.buckets (id, name, public) VALUES ('public-assets', 'public-assets', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read access on public-assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'public-assets');