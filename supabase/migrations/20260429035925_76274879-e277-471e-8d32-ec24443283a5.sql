-- Site público por barbearia: roteamento por slug + view pública.
-- Cloud guarda apenas o necessário para rotear; conteúdo do site vive
-- no MySQL daquele perfil (em business_settings com chaves site_*).

ALTER TABLE public.barbershop_profiles
  ADD COLUMN IF NOT EXISTS site_mode      text    NOT NULL DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS site_published boolean NOT NULL DEFAULT true;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'barbershop_profiles_site_mode_chk'
  ) THEN
    ALTER TABLE public.barbershop_profiles
      ADD CONSTRAINT barbershop_profiles_site_mode_chk
      CHECK (site_mode IN ('full','booking'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS barbershop_profiles_slug_pub_idx
  ON public.barbershop_profiles (slug)
  WHERE is_active = true AND site_published = true;

CREATE OR REPLACE VIEW public.barbershop_public
WITH (security_invoker=on) AS
  SELECT
    id,
    slug,
    name,
    site_mode,
    site_published,
    is_cloud,
    is_active
  FROM public.barbershop_profiles
  WHERE is_active = true AND site_published = true;

GRANT SELECT ON public.barbershop_public TO anon, authenticated;