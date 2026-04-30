-- Limpa produtos antigos demo (mantém os criados manualmente pelo admin)
-- e insere catálogo seed Styllus
DELETE FROM public.products WHERE title IN (
  'Pomada Styllus','Óleo para Barba Styllus','Shampoo Styllus Men',
  'Navalha Profissional','Bálsamo para Barba','Eau de Parfum Styllus'
);

INSERT INTO public.products (title, description, price, image_url, active, sort_order) VALUES
  ('Pomada Styllus', 'Pomada modeladora premium com fixação forte e brilho médio. Ideal para todos os estilos masculinos.', 79.90, '/styllus-products/product-pomade.jpg', true, 1),
  ('Óleo para Barba Styllus', 'Óleo nutritivo com argan e jojoba. Hidrata, amacia e dá brilho à barba sem deixar oleosidade.', 89.90, '/styllus-products/product-beardoil.jpg', true, 2),
  ('Shampoo Styllus Men', 'Shampoo profissional masculino. Limpa profundamente sem ressecar, com fragrância marcante.', 69.90, '/styllus-products/product-shampoo.jpg', true, 3),
  ('Navalha Profissional', 'Navalha clássica com cabo de madeira nobre e lâmina de aço inoxidável. Para o verdadeiro cavalheiro.', 249.90, '/styllus-products/product-razor.jpg', true, 4),
  ('Bálsamo para Barba', 'Bálsamo modelador que define, controla e nutre. Ideal para barbas longas e cheias.', 84.90, '/styllus-products/product-balm.jpg', true, 5),
  ('Eau de Parfum Styllus', 'Fragrância exclusiva amadeirada com notas cítricas. Sofisticação que marca presença.', 199.90, '/styllus-products/product-cologne.jpg', true, 6);

-- Garante que a configuração da loja existe
INSERT INTO public.business_settings (key, value)
VALUES ('store_enabled', 'true')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;