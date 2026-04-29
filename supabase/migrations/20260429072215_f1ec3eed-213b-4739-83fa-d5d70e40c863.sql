-- Domínio personalizado por barbearia (vinculado pelo super admin na Vercel)
ALTER TABLE public.barbershop_profiles
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS subdomain TEXT;

-- Únicos (case-insensitive). NULL permitido — só barbearias com domínio próprio preenchem.
CREATE UNIQUE INDEX IF NOT EXISTS barbershop_profiles_custom_domain_uidx
  ON public.barbershop_profiles (LOWER(custom_domain))
  WHERE custom_domain IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS barbershop_profiles_subdomain_uidx
  ON public.barbershop_profiles (LOWER(subdomain))
  WHERE subdomain IS NOT NULL;

-- Índice de lookup rápido por hostname (usado no public_query da edge function)
CREATE INDEX IF NOT EXISTS barbershop_profiles_domain_lookup_idx
  ON public.barbershop_profiles (LOWER(custom_domain), LOWER(subdomain))
  WHERE custom_domain IS NOT NULL OR subdomain IS NOT NULL;