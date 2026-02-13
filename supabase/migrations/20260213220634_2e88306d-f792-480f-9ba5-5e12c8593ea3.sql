
-- Create orders table
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  delivery_mode text NOT NULL DEFAULT 'pickup', -- 'delivery' or 'pickup'
  address text,
  address_number text,
  address_complement text,
  neighborhood text,
  city text,
  notes text,
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, preparing, delivering, completed, cancelled
  total_price numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'pix',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create order items table
CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_title text NOT NULL,
  product_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders policies
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete orders" ON public.orders FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Order items policies
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view order items" ON public.order_items FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete order items" ON public.order_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Add image_url column to prize_wheel_slices for real images
ALTER TABLE public.prize_wheel_slices ADD COLUMN IF NOT EXISTS image_url text;

-- Triggers for updated_at
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add store config settings
INSERT INTO public.business_settings (key, value) VALUES 
  ('store_order_mode', 'whatsapp'),
  ('pix_key', ''),
  ('pix_type', 'cpf')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Storage bucket for prize wheel images
INSERT INTO storage.buckets (id, name, public) VALUES ('prize-wheel-images', 'prize-wheel-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view prize wheel images" ON storage.objects FOR SELECT USING (bucket_id = 'prize-wheel-images');
CREATE POLICY "Admins can upload prize wheel images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prize-wheel-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update prize wheel images" ON storage.objects FOR UPDATE USING (bucket_id = 'prize-wheel-images' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete prize wheel images" ON storage.objects FOR DELETE USING (bucket_id = 'prize-wheel-images' AND has_role(auth.uid(), 'admin'::app_role));
