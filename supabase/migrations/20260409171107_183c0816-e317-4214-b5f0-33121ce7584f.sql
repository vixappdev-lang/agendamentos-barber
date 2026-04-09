
CREATE TABLE public.chatpro_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id text NOT NULL DEFAULT '',
  token text NOT NULL DEFAULT '',
  endpoint text NOT NULL DEFAULT 'https://v5.chatpro.com.br',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chatpro_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage chatpro config" ON public.chatpro_config
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_chatpro_config_updated_at
  BEFORE UPDATE ON public.chatpro_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
