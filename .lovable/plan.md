Plano completo para deixar o sistema mais rápido sem bagunçar o design atual.

Diagnóstico ao vivo feito em mobile 390x844:
- `/loja`: FCP medido em ~8,8s no preview. A página carrega muitos scripts antes de aparecer e ainda faz várias consultas separadas: produtos, configurações, categorias, avaliações e carrinho.
- `/agenda`: FCP ~6,6s. O fluxo carrega componentes pesados cedo demais e busca serviços, produtos e configurações mesmo quando o usuário só quer agendar.
- `/`: FCP ~7,7s. A landing está sendo importada de forma eager no `App.tsx`, então até rotas como loja/admin acabam baixando parte da landing primeiro.
- `/admin/cashier`: FCP ~6,2s, mas com alto custo de layout/style. O admin pré-carrega todas as abas depois da sessão, o que deixa a navegação futura melhor, mas pesa o primeiro carregamento em celular.
- Gargalos claros: favicon de 607KB, import global do Google Fonts via CSS, `VilaNova` eager em `App.tsx`, componentes/modal pesados importados antes de abrir, uso de `select('*')`, consulta de avaliações mesmo sem avaliações, imports de imagens/stock desnecessários, animações em massa nos cards, e preload excessivo do admin.

O que vou fazer agora, com prioridade em velocidade real:

1. Cortar peso inicial global
- Transformar a landing `VilaNova` em lazy route no `App.tsx`, mantendo só um fallback leve para a raiz.
- Fazer `HostnameResolver` receber o fallback por lazy render, para `/loja`, `/agenda` e `/admin` não baixarem a landing completa no primeiro load.
- Trocar o loader global pesado por skeleton/loader mínimo por rota, sem tela preta longa.
- Reduzir/adiar preloads do admin: em mobile, não pré-carregar todas as abas imediatamente; usar `requestIdleCallback` com atraso maior e só após a primeira pintura estável.

2. Otimizar fonte, favicon e recursos estáticos
- Remover `@import` do Google Fonts dentro do CSS e mover para `index.html` com `preconnect` e carregamento mais eficiente.
- Manter Montserrat e o design atual, só mudando a forma de carregar.
- Substituir/otimizar o favicon de 607KB por arquivo leve adequado para favicon, sem mudar a marca visual.
- Adicionar preload apenas para a imagem crítica do topo quando fizer sentido, evitando baixar imagens não visíveis antes da hora.

3. Loja ultra rápida no primeiro carregamento
- Separar componentes pesados da loja em lazy imports: `CheckoutModal`, `OrderTracker`, `AuthRequiredModal`, `ProductDetailModal`, `CartDrawer` e área de conta só serão baixados quando usados.
- Remover `framer-motion` dos cards de produto no primeiro grid ou neutralizar animação em lote no mobile, preservando transições simples por CSS.
- Ajustar o hero slider para não trocar imagem antes da primeira renderização estável; primeiro hero aparece imediato, slider começa depois.
- Limitar render inicial a produtos essenciais acima da dobra e carregar o restante progressivamente, mantendo o catálogo completo.
- Usar `select` com colunas necessárias em vez de `select('*')` para produtos/configurações/categorias.
- Buscar avaliações de produto só quando houver avaliações ou quando o produto/modal precisar; atualmente há 0 avaliações e mesmo assim a loja consulta `product_reviews` e abre realtime.
- Desativar realtime de avaliações no carregamento inicial da loja; se necessário, atualizar por refetch leve ao abrir detalhes.
- Carrinho: iniciar instantâneo pelo cache local e só sincronizar remoto depois da primeira pintura; evitar upsert automático logo ao entrar se nada mudou.

4. Agendamento mais rápido
- Em `/agenda`, remover busca de produtos no carregamento inicial quando a aba inicial é “Agendar”. Produtos só entram se o usuário abrir a aba loja ali dentro, ou direcionar para `/loja`.
- Lazy load de `BookingFlow`, `DirectionsModal`, `PrizeWheel`, `CheckoutModal` e `OrderTracker`, carregando só quando o usuário clicar.
- Remover imports diretos de imagens de serviços quando a imagem não estiver visível/necessária, preservando fallback visual.
- Usar colunas específicas para serviços/configurações.
- Evitar consultas duplicadas de `business_settings` entre `Header`, `Index` e `BookingFlow`, reaproveitando dados quando possível.

5. Landing/site mais leve
- Lazy load de seções abaixo da dobra e modais: mapa/como chegar, galeria, todos serviços e extras.
- Evitar carregar `LandingExtras` e `date-fns locale` antes da seção de depoimentos aparecer.
- Carregar somente a primeira imagem hero no início; demais imagens do slider entram depois.
- Adiar bloqueio/devtools e efeitos não críticos para depois da primeira pintura.

6. Admin mais estável e rápido no mobile
- Remover preload agressivo de todas as páginas admin no mobile.
- Pré-carregar apenas a próxima rota provável/rota atual e deixar o restante para idle real.
- Revisar páginas com tabelas grandes para manter limite e renderização leve.
- Manter correções anteriores de estabilidade mobile; não mexer no layout visual.

7. Banco de dados e consultas
- Criar índices seguros para consultas frequentes, se ainda faltarem:
  - produtos ativos por ordenação/categoria;
  - serviços ativos por ordenação;
  - barbeiros ativos por ordenação;
  - agendamentos por data, barbeiro e status;
  - avaliações públicas aprovadas por produto/status.
- Se valer a pena, criar uma view/RPC pública leve para a loja retornar produtos + categorias + configurações essenciais em uma única chamada, reduzindo waterfall de rede.
- Não alterar regras de segurança existentes; qualquer mudança de banco será via migration com RLS preservado.

8. Plano completo para expandir ainda mais a loja
- Estrutura comercial:
  - vitrine com “Mais vendidos”, “Novidades”, “Combos”, “Promoções” e “Últimas unidades”;
  - selo de estoque baixo, destaque de entrega/retirada e política de troca;
  - produto com galeria, variações simples e itens relacionados.
- Conversão:
  - checkout WhatsApp profissional já preenchido;
  - cupom/campanha por categoria;
  - recuperação de carrinho por WhatsApp opcional;
  - botão “Comprar novamente” em pedidos.
- Conta da loja autônoma:
  - pedidos da loja separados da área de barbearia;
  - endereço/telefone salvos para próximas compras;
  - histórico de compras e status.
- Admin da loja:
  - dashboard de vendas, estoque baixo, produtos sem imagem, categorias, cupons e pedidos;
  - cadastro de banners do slider;
  - controle de formas de pagamento e dados PIX;
  - relatórios básicos de produtos mais vendidos.
- Performance contínua:
  - paginação/infinite scroll no catálogo quando crescer;
  - imagens otimizadas e lazy loading real;
  - cache das configurações públicas;
  - métricas de carregamento para monitorar loja/agendamento/admin.

9. Verificação final
- Medir novamente `/loja`, `/agenda`, `/`, `/admin/cashier` em 390x844.
- Conferir rede: menos scripts iniciais, menos consultas, favicon menor e modais fora do bundle inicial.
- Conferir visual: design intacto, responsivo no mobile, sem rodapé cortado, sem carrinho sobrepondo menu, sem tela inicial desalinhada.
- Conferir funcionalidades: busca/categoria da loja, carrinho, checkout WhatsApp, conta/pedidos, abertura de agendamento e admin.

Arquivos previstos:
- `src/App.tsx`
- `src/components/HostnameResolver.tsx`
- `src/pages/StorePage.tsx`
- `src/components/ProductCard.tsx`
- `src/hooks/useCart.ts`
- `src/hooks/useProductRatings.ts`
- `src/pages/Index.tsx`
- `src/pages/VilaNova.tsx`
- `src/components/Header.tsx`
- `src/components/landing/LandingExtras.tsx`
- `src/components/admin/AdminLayout.tsx`
- `src/index.css`
- `index.html`
- `public/favicon.png` / `public/favicon.ico`
- nova migration para índices/view/RPC, se aprovado.

Não vou mudar a identidade visual nem refazer design. A intervenção será estrutural: carregar menos coisa no início, consultar menos dados, adiar módulos pesados, otimizar recursos e preparar a loja para escalar profissionalmente.