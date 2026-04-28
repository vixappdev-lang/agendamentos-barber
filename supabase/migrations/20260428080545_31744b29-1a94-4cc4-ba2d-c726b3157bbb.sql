-- Chave de criptografia simétrica (gerada uma vez). Usamos pgsodium secret box.
-- Guardamos a chave em uma settings interna para ficar estável entre cripto/decripto.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pgsodium.key WHERE name = 'mysql_password_key'
  ) THEN
    PERFORM pgsodium.create_key(
      key_type := 'aead-det'::pgsodium.key_type,
      name := 'mysql_password_key'
    );
  END IF;
END$$;

-- Encrypt: recebe texto puro, devolve base64 com nonce embutido
CREATE OR REPLACE FUNCTION public.encrypt_mysql_password(_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  _key_id uuid;
  _ciphertext bytea;
BEGIN
  SELECT id INTO _key_id FROM pgsodium.key WHERE name = 'mysql_password_key' LIMIT 1;
  IF _key_id IS NULL THEN
    RAISE EXCEPTION 'mysql_password_key not configured';
  END IF;
  _ciphertext := pgsodium.crypto_aead_det_encrypt(
    convert_to(_plain, 'utf8'),
    convert_to('mysql_profiles', 'utf8'),
    _key_id
  );
  RETURN encode(_ciphertext, 'base64');
END;
$$;

-- Decrypt: inverso. Apenas service_role chama (via edge function).
CREATE OR REPLACE FUNCTION public.decrypt_mysql_password(_encrypted text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  _key_id uuid;
  _plain bytea;
BEGIN
  SELECT id INTO _key_id FROM pgsodium.key WHERE name = 'mysql_password_key' LIMIT 1;
  IF _key_id IS NULL THEN
    RAISE EXCEPTION 'mysql_password_key not configured';
  END IF;
  _plain := pgsodium.crypto_aead_det_decrypt(
    decode(_encrypted, 'base64'),
    convert_to('mysql_profiles', 'utf8'),
    _key_id
  );
  RETURN convert_from(_plain, 'utf8');
END;
$$;

-- Tranca acesso público; só service_role/postgres podem chamar
REVOKE EXECUTE ON FUNCTION public.encrypt_mysql_password(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_mysql_password(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_mysql_password(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_mysql_password(text) TO service_role;