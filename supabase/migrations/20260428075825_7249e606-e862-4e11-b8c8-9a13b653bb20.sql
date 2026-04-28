-- Habilita pgsodium para criptografia
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Tabela de perfis MySQL
CREATE TABLE public.mysql_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 3306,
  database_name text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,
  ssl_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_status text,
  last_test_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para garantir só 1 ativo por vez
CREATE UNIQUE INDEX idx_mysql_profiles_only_one_active
  ON public.mysql_profiles ((is_active)) WHERE is_active = true;

-- RLS
ALTER TABLE public.mysql_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select mysql_profiles"
  ON public.mysql_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert mysql_profiles"
  ON public.mysql_profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update mysql_profiles"
  ON public.mysql_profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete mysql_profiles"
  ON public.mysql_profiles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_mysql_profiles_updated_at
  BEFORE UPDATE ON public.mysql_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função utilitária: ativar um perfil (desativa todos os outros)
CREATE OR REPLACE FUNCTION public.activate_mysql_profile(_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can activate MySQL profiles';
  END IF;

  UPDATE public.mysql_profiles SET is_active = false WHERE is_active = true;
  UPDATE public.mysql_profiles SET is_active = true WHERE id = _profile_id;
END;
$$;

-- Função utilitária: desativar todos (volta pro Cloud)
CREATE OR REPLACE FUNCTION public.deactivate_all_mysql_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can deactivate MySQL profiles';
  END IF;

  UPDATE public.mysql_profiles SET is_active = false WHERE is_active = true;
END;
$$;