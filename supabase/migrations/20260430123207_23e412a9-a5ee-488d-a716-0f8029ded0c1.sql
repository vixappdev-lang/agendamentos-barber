
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_token text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reviewed boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  order_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  status text NOT NULL DEFAULT 'approved',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create product reviews"
  ON public.product_reviews FOR INSERT
  WITH CHECK (
    rating BETWEEN 1 AND 5
    AND length(customer_name) BETWEEN 2 AND 120
    AND (comment IS NULL OR length(comment) <= 1000)
  );

CREATE POLICY "Public can view approved product reviews"
  ON public.product_reviews FOR SELECT
  USING (status = 'approved' AND is_public = true);

CREATE POLICY "Admins can view all product reviews"
  ON public.product_reviews FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update product reviews"
  ON public.product_reviews FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete product reviews"
  ON public.product_reviews FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_order ON public.product_reviews(order_id);
