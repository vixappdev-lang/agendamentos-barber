-- Categorias profissionais (idempotente)
INSERT INTO public.product_categories (slug, label, icon, sort_order, active) VALUES
  ('camisetas',   'Camisetas Premium',          '👕', 10, true),
  ('polos',       'Camisas Polo',               '👔', 15, true),
  ('moletons',    'Moletons & Jaquetas',        '🧥', 20, true),
  ('bermudas',    'Bermudas & Shorts',          '🩳', 30, true),
  ('calcas',      'Calças & Joggers',           '👖', 40, true),
  ('tenis',       'Tênis & Calçados',           '👟', 50, true),
  ('acessorios',  'Acessórios Masculinos',      '🧢', 60, true),
  ('barba',       'Cuidados para Barba',        '🧔', 70, true),
  ('cabelo',      'Finalizadores de Cabelo',    '💈', 80, true),
  ('fragrancias', 'Perfumes & Fragrâncias',     '🌿', 90, true),
  ('combos',      'Kits & Combos',              '🎁', 100, true),
  ('geral',       'Coleção Geral',              '📦', 999, true)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  active = true;

-- Renomear produtos antigos "Styllus" para Genesis Sistemas (sem apagar)
UPDATE public.products
SET title = REPLACE(REPLACE(title, 'Styllus Men', 'Genesis Sistemas'), 'Styllus', 'Genesis Sistemas'),
    brand = 'Genesis Sistemas',
    description = REPLACE(COALESCE(description, ''), 'Styllus', 'Genesis Sistemas')
WHERE title ILIKE '%styllus%' OR brand ILIKE '%styllus%';
