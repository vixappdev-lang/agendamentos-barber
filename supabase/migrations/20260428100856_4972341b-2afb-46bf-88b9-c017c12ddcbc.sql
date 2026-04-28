-- ============================================================
-- 1) Coluna review_token nos agendamentos
-- ============================================================
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS review_token TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_appointments_review_token
  ON public.appointments (review_token);

-- ============================================================
-- 2) Coluna permissions (JSONB) em barbershop_profiles
-- ============================================================
ALTER TABLE public.barbershop_profiles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{
    "dashboard": true,
    "finance": true,
    "services": true,
    "store": true,
    "barbers": true,
    "appointments": true,
    "coupons": true,
    "chatpro": true,
    "reviews": true,
    "settings": true
  }'::jsonb;

-- ============================================================
-- 3) Tabela reviews
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  appointment_id UUID,
  review_token TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode ver avaliações aprovadas e públicas (depoimentos)
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved' AND is_public = true);

-- Admins podem ver todas
DROP POLICY IF EXISTS "Admins can view all reviews" ON public.reviews;
CREATE POLICY "Admins can view all reviews"
  ON public.reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Qualquer pessoa pode criar avaliação (form público)
DROP POLICY IF EXISTS "Anyone can create reviews" ON public.reviews;
CREATE POLICY "Anyone can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(customer_name) BETWEEN 2 AND 120
    AND (comment IS NULL OR length(comment) <= 1000)
  );

-- Admins podem atualizar (aprovar/recusar/editar)
DROP POLICY IF EXISTS "Admins can update reviews" ON public.reviews;
CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins podem deletar
DROP POLICY IF EXISTS "Admins can delete reviews" ON public.reviews;
CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();