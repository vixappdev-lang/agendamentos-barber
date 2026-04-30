
-- ============================================================
-- FASE 1: Agendamento — slots manuais e novas configurações
-- ============================================================
CREATE TABLE IF NOT EXISTS public.available_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_time time NOT NULL,
  weekday smallint NULL, -- 0=dom .. 6=sab; NULL = todos
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.available_time_slots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active slots" ON public.available_time_slots;
CREATE POLICY "Anyone can view active slots" ON public.available_time_slots
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins manage slots" ON public.available_time_slots;
CREATE POLICY "Admins manage slots" ON public.available_time_slots
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Defaults idempotentes em business_settings
INSERT INTO public.business_settings (key, value) VALUES
  ('slot_generation_mode', 'interval'),
  ('week_window_mode', 'rolling'),
  ('appointment_lock_strict', 'true'),
  ('store_member_tracking_enabled', 'true'),
  ('gallery_images', '[]')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FASE 2: panel_users (multi-usuário admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.panel_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'manager', -- admin | manager | barber
  barber_id uuid NULL,
  permissions jsonb NOT NULL DEFAULT '{"dashboard":true,"appointments":true,"services":true,"barbers":true,"finance":false,"commands":true,"cashier":false,"commissions":false,"credit":false,"inventory":false,"suppliers":false,"store":false,"coupons":false,"reviews":true,"settings":false}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.panel_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view panel_users" ON public.panel_users;
CREATE POLICY "Admins view panel_users" ON public.panel_users
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins insert panel_users" ON public.panel_users;
CREATE POLICY "Admins insert panel_users" ON public.panel_users
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update panel_users" ON public.panel_users;
CREATE POLICY "Admins update panel_users" ON public.panel_users
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete panel_users" ON public.panel_users;
CREATE POLICY "Admins delete panel_users" ON public.panel_users
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_panel_users_updated ON public.panel_users;
CREATE TRIGGER trg_panel_users_updated
  BEFORE UPDATE ON public.panel_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.hash_panel_password(_plain text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _plain IS NULL OR length(_plain) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;
  RETURN extensions.crypt(_plain, extensions.gen_salt('bf', 10));
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_panel_login(_email text, _plain text)
RETURNS TABLE (
  id uuid, email text, full_name text, role text, barber_id uuid,
  permissions jsonb, active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT pu.id, pu.email, pu.full_name, pu.role, pu.barber_id, pu.permissions, pu.active
  FROM public.panel_users pu
  WHERE pu.email = lower(trim(_email))
    AND pu.active = true
    AND pu.password_hash = extensions.crypt(_plain, pu.password_hash);
END;
$$;

-- ============================================================
-- FASE 6: Categoria de serviços + comodidades por barbearia
-- ============================================================
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category text DEFAULT 'geral';

CREATE TABLE IF NOT EXISTS public.barbershop_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amenity_key text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.barbershop_amenities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone view active amenities" ON public.barbershop_amenities;
CREATE POLICY "Anyone view active amenities" ON public.barbershop_amenities
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins manage amenities" ON public.barbershop_amenities;
CREATE POLICY "Admins manage amenities" ON public.barbershop_amenities
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- FASE 4: payment_method em orders
-- ============================================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'pix';

-- ============================================================
-- FASE 8: Módulos Cloud — Suppliers, Cashier, Commissions, Credit, Commands
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text,
  phone text,
  email text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage suppliers" ON public.suppliers;
CREATE POLICY "Admins manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_suppliers_updated ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.cashier_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_amount numeric(12,2) NOT NULL DEFAULT 0,
  closing_amount numeric(12,2),
  panel_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cashier_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage cashier_sessions" ON public.cashier_sessions;
CREATE POLICY "Admins manage cashier_sessions" ON public.cashier_sessions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.cashier_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cashier_sessions(id) ON DELETE CASCADE,
  type text NOT NULL, -- in | out
  amount numeric(12,2) NOT NULL,
  description text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cashier_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage cashier_movements" ON public.cashier_movements;
CREATE POLICY "Admins manage cashier_movements" ON public.cashier_movements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid,
  barber_name text,
  appointment_id uuid,
  percent numeric(5,2),
  amount numeric(12,2) NOT NULL,
  paid boolean NOT NULL DEFAULT false,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage commissions" ON public.commissions;
CREATE POLICY "Admins manage commissions" ON public.commissions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.credit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  balance numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage credit_accounts" ON public.credit_accounts;
CREATE POLICY "Admins manage credit_accounts" ON public.credit_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS trg_credit_accounts_updated ON public.credit_accounts;
CREATE TRIGGER trg_credit_accounts_updated BEFORE UPDATE ON public.credit_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.credit_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.credit_accounts(id) ON DELETE CASCADE,
  type text NOT NULL, -- debit | credit
  amount numeric(12,2) NOT NULL,
  description text,
  appointment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.credit_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage credit_movements" ON public.credit_movements;
CREATE POLICY "Admins manage credit_movements" ON public.credit_movements
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text,
  status text NOT NULL DEFAULT 'open', -- open | closed
  total numeric(12,2) NOT NULL DEFAULT 0,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  panel_user_id uuid,
  barber_name text
);
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage commands" ON public.commands;
CREATE POLICY "Admins manage commands" ON public.commands
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.command_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid NOT NULL REFERENCES public.commands(id) ON DELETE CASCADE,
  type text NOT NULL, -- service | product
  ref_id uuid,
  title text NOT NULL,
  price numeric(12,2) NOT NULL,
  qty int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.command_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage command_items" ON public.command_items;
CREATE POLICY "Admins manage command_items" ON public.command_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Seed amenities default (Wi-Fi, café, estacionamento, ar)
INSERT INTO public.barbershop_amenities (amenity_key, sort_order) VALUES
  ('wifi', 1), ('coffee', 2), ('parking', 3), ('ar', 4)
ON CONFLICT (amenity_key) DO NOTHING;
