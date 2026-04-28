-- Extensão pgcrypto (bcrypt para senhas dos donos)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- Tabela: barbershop_profiles
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.barbershop_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,
  name             text NOT NULL,
  owner_name       text,
  owner_email      text NOT NULL,
  owner_password   text NOT NULL,                      -- bcrypt hash
  phone            text,
  address          text,
  mysql_profile_id uuid REFERENCES public.mysql_profiles(id) ON DELETE SET NULL,
  is_cloud         boolean NOT NULL DEFAULT false,
  is_locked        boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT barbershop_slug_format CHECK (slug ~ '^[a-z0-9-]+$' AND length(slug) BETWEEN 2 AND 60),
  CONSTRAINT barbershop_email_format CHECK (owner_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

CREATE INDEX IF NOT EXISTS idx_barbershop_profiles_active ON public.barbershop_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_barbershop_profiles_email  ON public.barbershop_profiles(owner_email);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_barbershop_profiles_updated_at ON public.barbershop_profiles;
CREATE TRIGGER trg_barbershop_profiles_updated_at
BEFORE UPDATE ON public.barbershop_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.barbershop_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin select barbershops"  ON public.barbershop_profiles;
DROP POLICY IF EXISTS "admin insert barbershops"  ON public.barbershop_profiles;
DROP POLICY IF EXISTS "admin update barbershops"  ON public.barbershop_profiles;
DROP POLICY IF EXISTS "admin delete barbershops"  ON public.barbershop_profiles;

CREATE POLICY "admin select barbershops"
  ON public.barbershop_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin insert barbershops"
  ON public.barbershop_profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin update barbershops"
  ON public.barbershop_profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') AND is_locked = false)
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND is_locked = false);

CREATE POLICY "admin delete barbershops"
  ON public.barbershop_profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin') AND is_locked = false);

-- =====================================================================
-- RPC: hash_owner_password (bcrypt no servidor, nunca em texto puro)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.hash_owner_password(_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _plain IS NULL OR length(_plain) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can hash passwords';
  END IF;
  RETURN crypt(_plain, gen_salt('bf', 10));
END;
$$;

REVOKE ALL ON FUNCTION public.hash_owner_password(text) FROM public;
GRANT EXECUTE ON FUNCTION public.hash_owner_password(text) TO authenticated;

-- =====================================================================
-- Seed: Vila Nova Barbershop (Cloud, travado)
-- =====================================================================
INSERT INTO public.barbershop_profiles
  (slug, name, owner_name, owner_email, owner_password, is_cloud, is_locked, is_active)
SELECT
  'vila-nova',
  'Vila Nova Barbershop',
  'Admin',
  'admin-barber@gmail.com',
  crypt('lovable-cloud-managed', gen_salt('bf', 10)),
  true,
  true,
  true
WHERE NOT EXISTS (SELECT 1 FROM public.barbershop_profiles WHERE slug = 'vila-nova');