CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email text,
  customer_phone text,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  appointment_id uuid,
  order_id uuid,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_email ON public.notifications (customer_email);
CREATE INDEX IF NOT EXISTS idx_notifications_phone ON public.notifications (customer_phone);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (customer_email = auth.email());

CREATE POLICY "Users update own notifications read"
ON public.notifications FOR UPDATE
TO authenticated
USING (customer_email = auth.email())
WITH CHECK (customer_email = auth.email());

CREATE POLICY "Anyone can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;