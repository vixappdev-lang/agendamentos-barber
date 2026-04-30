CREATE TABLE IF NOT EXISTS public.user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cart" ON public.user_carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cart" ON public.user_carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cart" ON public.user_carts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cart" ON public.user_carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_user_carts_updated_at BEFORE UPDATE ON public.user_carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();