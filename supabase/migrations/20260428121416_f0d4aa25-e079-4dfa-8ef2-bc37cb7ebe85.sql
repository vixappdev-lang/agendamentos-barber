-- Replace pgsodium-based encryption with pgcrypto (pgp_sym_encrypt) which works
-- without elevated permissions. Store the symmetric key in a private table only
-- accessible via SECURITY DEFINER functions.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Private key store (no direct access; only SECURITY DEFINER funcs read it)
CREATE TABLE IF NOT EXISTS public._mysql_crypto_key (
  id int PRIMARY KEY DEFAULT 1,
  key text NOT NULL,
  CONSTRAINT _mysql_crypto_key_singleton CHECK (id = 1)
);

ALTER TABLE public._mysql_crypto_key ENABLE ROW LEVEL SECURITY;
-- No policies => nobody can read/write directly. SECURITY DEFINER bypasses RLS.

-- Seed a strong random key once
INSERT INTO public._mysql_crypto_key (id, key)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (id) DO NOTHING;

REVOKE ALL ON public._mysql_crypto_key FROM PUBLIC, anon, authenticated;

-- Recreate encryption helpers using pgp_sym_encrypt
CREATE OR REPLACE FUNCTION public.encrypt_mysql_password(_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  IF _plain IS NULL OR length(_plain) = 0 THEN
    RAISE EXCEPTION 'Password is required';
  END IF;
  SELECT key INTO _key FROM public._mysql_crypto_key WHERE id = 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN encode(extensions.pgp_sym_encrypt(_plain, _key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_mysql_password(_encrypted text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _key text;
BEGIN
  IF _encrypted IS NULL OR length(_encrypted) = 0 THEN
    RETURN NULL;
  END IF;
  SELECT key INTO _key FROM public._mysql_crypto_key WHERE id = 1;
  IF _key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  RETURN extensions.pgp_sym_decrypt(decode(_encrypted, 'base64'), _key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.encrypt_mysql_password(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_mysql_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_mysql_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_mysql_password(text) TO service_role;