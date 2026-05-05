Vou corrigir isso sem mexer na identidade visual existente, focando em estabilidade e ajustes cirúrgicos. Investigação ao vivo feita em 390x844:

- No admin `/admin/suppliers`, a página renderiza, mas o problema real continua no menu mobile: ele usa largura `82vw`/`max-w-72`, deixando parte da tela escura visível e a percepção de layout quebrado. Também há dependência de `motion.aside`/overlay e `Suspense` global que pode mostrar loader de tela inteira entre abas.
- Na loja `/loja`, confirmei: existe botão de voltar para `/`, o rodapé fica escondido atrás do menu inferior, e o menu inferior/carrinho disputam espaço. O carrinho abre como drawer de tela inteira no mobile e o conteúdo ainda mantém scroll de página por baixo.

Plano de correção:

1. Corrigir definitivamente o admin mobile
   - Transformar o sidebar mobile em painel 100% estável no primeiro render:
     - remover `motion.aside` onde não é necessário para o menu lateral;
     - usar largura consistente no mobile (`min(320px, 86vw)` ou `w-[86vw]`) com overlay previsível;
     - travar `overflow-x-hidden` no wrapper do admin;
     - garantir que o conteúdo principal comece sempre alinhado e sem deslocamento lateral.
   - Trocar o loader global entre abas por um loader interno menor/estável para não aparecer tela preta completa quando troca de aba ou carrega chunk.
   - Fechar o menu ao trocar rota sem deixar overlay preso.
   - Remover dependências de animação inicial nas partes críticas do admin mobile, mantendo o design visual igual.

2. Revisar as páginas internas do admin que ainda podem quebrar no primeiro carregamento
   - Localizei várias páginas admin com `motion` e `initial={{ opacity/y }}`. Vou neutralizar somente o que afeta primeira renderização mobile, sem apagar modais ou interações.
   - Prioridade: Dashboard, Loja/KPIs/Categorias/Configurações, Avaliações, Usuários, ChatPro e componentes comuns.
   - Ajustar listas/tabelas para não gerar overflow lateral no mobile quando carregam vazias ou com dados.

3. Corrigir loja: remover botão de voltar para `/`
   - Remover o botão de voltar no header da loja.
   - Manter a marca/nome da loja no header.
   - Se a loja estiver indisponível, trocar o botão “Voltar” por uma ação neutra/sem redirecionar para `/` ou simplesmente remover esse retorno.

4. Corrigir menu inferior e carrinho da loja no mobile
   - O menu inferior será a navegação principal fixa.
   - Remover/ocultar o botão flutuante do carrinho no mobile para ele não disputar espaço com o menu.
   - Manter o botão flutuante apenas em telas maiores, se fizer sentido.
   - Ajustar o badge do carrinho no menu inferior para ficar centralizado e não “torto”.
   - Quando o carrinho abrir no mobile, bloquear scroll de fundo e respeitar safe-area.

5. Corrigir rodapé cortado
   - Adicionar padding inferior real no container da loja quando o menu inferior está presente.
   - Aumentar o `padding-bottom` do footer no mobile para que “Compra segura” e os últimos itens não fiquem escondidos atrás do menu.
   - Garantir que a página role até o fim sem ficar presa antes do final.

6. Limpeza geral da loja sem mudar design
   - Ajustar categorias para nomes profissionais e consistentes com o admin já existente.
   - Garantir que ao clicar em uma categoria apareçam somente produtos daquela categoria.
   - Melhorar o espaçamento dos cards no mobile sem alterar a aparência base.
   - Evitar títulos de categoria truncados demais no chip horizontal.

7. Produtos/categorias e admin da loja
   - Criar uma migração segura para completar/atualizar categorias profissionais (`Camisetas Premium`, `Bermudas & Shorts`, `Tênis & Calçados`, `Moletons & Jaquetas`, `Acessórios Masculinos`, `Cuidados para Barba`, `Finalizadores`, `Fragrâncias`, `Kits & Combos`).
   - Atualizar produtos seed antigos que ainda têm “Styllus” para Genesis Sistemas/Genesis, sem apagar produtos criados manualmente.
   - Inserir mais produtos profissionais somente quando não existirem, mantendo os produtos atuais.
   - No admin da loja, deixar a lista de produtos/categorias mais responsiva no mobile, sem mudar o design.

8. Verificação final ao vivo
   - Testar no viewport 390x844:
     - `/admin/suppliers` no primeiro carregamento;
     - abrir/fechar menu admin;
     - navegar para `/admin/store` e outras abas;
     - `/loja` topo, categorias, carrinho, conta/pedidos e fim do rodapé.
   - Confirmar que não aparece loader preso, tela desalinhada, rodapé cortado, botão voltar, nem carrinho sobreposto ao menu.

Arquivos previstos:
- `src/components/admin/AdminLayout.tsx`
- `src/App.tsx`
- `src/index.css`
- páginas admin com animações críticas, se necessário
- `src/pages/StorePage.tsx`
- `src/components/store/CartDrawer.tsx`
- `src/components/ProductCard.tsx`, se o botão/card precisar separar clique de abrir detalhe e adicionar carrinho
- `src/pages/admin/Products.tsx`
- `src/pages/admin/Categories.tsx`
- nova migration em `supabase/migrations/...` para completar catálogo/categorias

Não vou alterar o design base: só corrigir estrutura, responsividade, sobreposição, scroll, seed de loja e estabilidade mobile.