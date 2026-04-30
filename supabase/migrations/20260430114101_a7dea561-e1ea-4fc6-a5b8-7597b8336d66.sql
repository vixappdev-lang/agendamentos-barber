ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS stock integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS gallery jsonb DEFAULT '[]'::jsonb;