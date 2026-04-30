
# Plano Master — Styllus / Genesis Barber

Plano em 9 fases. Cada fase é independente e testável. Tudo no Lovable Cloud (Supabase) — MySQL fica como **opcional/avançado** (se ativo, sincroniza; se não, Cloud é a fonte de verdade). Sem quebrar nada do que já funciona.

---

## FASE 1 — Backend de Agendamento Funcional (núcleo)

Objetivo: as configurações de **Settings → Agendamento** virarem regras reais que o site, `/agenda-direto` e `MemberArea` respeitam de forma idêntica.

### 1.1 Schema (migration)

Nova tabela `available_time_slots` (horários personalizáveis pelo admin):
```
id uuid pk
slot_time time     -- 08:30, 09:00, etc
weekday smallint   -- 0..6 (NULL = todos os dias)
active boolean default true
sort_order int
```
RLS: anyone select onde active=true; admins ALL.

Migration adicional em `business_settings` — apenas garantir defaults via insert idempotente das chaves novas:
- `slot_generation_mode` ("interval" | "manual") — interval usa `default_duration`+`interval_between`, manual usa a tabela acima.
- `week_window_mode` ("rolling" | "current_week") — current_week reseta toda segunda.
- `appointment_lock_strict` ("true") — força não exibir slots com conflito.

### 1.2 Hook único `useBookingRules()` (novo, `src/hooks/useBookingRules.ts`)

Centraliza:
- Geração de slots (lê `slot_generation_mode`)
- Filtro por `days_off`, `closed_days`, `min_advance_hours`, `max_advance_days`
- Janela de datas: `current_week` → seg→dom da semana atual; `rolling` → próximos N dias
- Conflito: cruza com `appointments` (status pending|confirmed) considerando `max_per_slot`, `buffer_same_barber`, `interval_between`
- Retorna `{ dates, getTimesFor(date, barberId), isSlotBlocked(date,time,barberId) }`

### 1.3 Aplicar em três pontos

`src/pages/VilaNova.tsx` (booking flow), `src/pages/AgendaDireto.tsx`, `src/pages/MemberArea.tsx` → todos passam a usar `useBookingRules`. Slots ocupados ficam **disabled visualmente** (não-clicáveis), com tooltip "Indisponível".

### 1.4 Aba nova em Settings: gestão de slots manuais

Em `Settings.tsx` aba **Horários**, adicionar bloco "Horários da agenda":
- Toggle `slot_generation_mode`
- Quando "manual": grid editável (add/edit/remove) que escreve em `available_time_slots`
- Preview: lista os slots gerados para hoje e amanhã

### 1.5 Modo de Confirmação

`confirmation_mode = manual` → INSERT salva `status: pending`; `auto` → `status: confirmed`. Já existe a chave; só falta aplicar no INSERT em VilaNova/AgendaDireto/MemberArea.

---

## FASE 2 — Aba "Usuários" (multi-conta admin com isolamento)

Objetivo: criar logins de barbeiros/staff com permissões e **dashboard isolado** (cada um vê apenas seus dados).

### 2.1 Schema

```
table panel_users
  id uuid pk
  email text unique
  full_name text
  password_hash text   -- bcrypt via função SECURITY DEFINER
  role text            -- 'admin' | 'manager' | 'barber'
  barber_id uuid null  -- FK lógica para barbers.id (quando role=barber)
  permissions jsonb    -- { dashboard:true, services:true, finance:false, ... }
  active boolean
  created_at, updated_at

function hash_panel_password(_plain text)  -- já existe pattern no hash_owner_password
function verify_panel_login(_email, _plain) returns panel_users row
```
RLS: somente admins veem/gerenciam; barbeiros logam mas não SELECT na tabela.

### 2.2 Página `src/pages/admin/Users.tsx`

- Listagem paginada (10/página) com busca, badge de role, status
- Botão "Novo Usuário" → modal (nome, email, senha, role, se barber → seleciona `barber_id`, matriz de permissões com toggles agrupados)
- Editar / desativar / resetar senha (modal)

Adicionar item ao `navItems` em `AdminLayout.tsx`: **Usuários** (super-admin only).

### 2.3 Isolamento de dados

`src/lib/adminMysqlSession.ts` já guarda `permissions`. Estender para guardar `panel_user_id`, `role`, `barber_id`. Em todas as páginas admin que mostram dados (Dashboard, Appointments, Finance, Commissions, Cashier, Commands, Credit):
- Se `role === 'barber'` → filtra todas queries por `barber_name = session.full_name` (ou via `barber_id` quando aplicável)
- Dashboard: cards começam zerados naturalmente porque queries filtram

Login admin (`AdminLogin.tsx`) ganha caminho alternativo: tenta Supabase Auth → se falhar, tenta `verify_panel_login` RPC.

---

## FASE 3 — ChatPro restrito ao super-admin

Em `AdminLayout.tsx` `navItems`: marcar **ChatPro** com `superAdminOnly: true`. Já existe o pattern (`Perfis Barbearias`). Item some para barbeiros e para `panel_users` que não sejam o email super-admin.

---

## FASE 4 — Loja: redesign + fluxo carrinho/login/pagamento integrado

### 4.1 StorePage (mobile-first refinado)

`src/pages/StorePage.tsx`:
- **Hero**: título compacto "BarberShop Styllus" (não "Produtos premium para o..."), background gerado a partir das cores da marca + textura/foto do Insta (gerar 1 nova `store-hero-v2.jpg` com IA usando logo+galeria como referência visual).
- **Remover slider de destaques** OU substituir por carrossel horizontal compacto de chips (mais limpo). Default: remover, manter apenas grid.
- **Trust strip**: refazer responsivo — em mobile vira **2 colunas + 1** ou empilhado, sem cortar. Ícones menores em xs.
- **Cards de produto**: padronizar altura, padding e botão (revisar `ProductCard.tsx`). Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` com `gap-3 sm:gap-4`.
- Ajustar `Meus Pedidos` (mobile): label sempre visível como ícone com badge.

### 4.2 Fluxo de carrinho com login obrigatório

Novo componente `src/components/store/CartDrawer.tsx`:
- Bottom sheet (mobile) / sidebar (desktop) com itens, qty +/-, remover, subtotal
- Botão "Finalizar pedido" → checa `supabase.auth.getSession()`:
  - Sem sessão → abre `AuthRequiredModal` (login OU criar conta — mesmo padrão de `AgendaDireto.tsx`, telefone+senha)
  - Com sessão → abre `CheckoutModal` já pré-preenchido (nome/telefone do user_metadata)

### 4.3 CheckoutModal — pagamento na entrega

`src/components/store/CheckoutModal.tsx`:
- Adicionar `payment_method`: PIX | Na Entrega (cards selecionáveis)
- Quando "Na entrega" → pula step `payment`, vai direto para `confirmed`
- Salvar `payment_method` no INSERT de `orders` (coluna já existe)
- Após confirmar → `navigate("/membro?tab=orders")` (área do cliente abre na aba pedidos)

### 4.4 Modal "Tipo de chave PIX" — refazer visual

Onde aparece input de pix_type (Settings PIX), substituir `<select>` por grid de cards (CPF / CNPJ / Email / Telefone / Aleatória) com ícones e estado ativo — mesmo padrão visual do `ToggleCard` existente.

### 4.5 Realtime de status do pedido

`OrderTracker.tsx` já tem realtime. Garantir que `MemberArea.tsx` aba `orders` também ouça mudanças e atualize cards estilo iFood (stepper visual).

### 4.6 Configuração no admin: ativar loja na área do cliente

`src/components/store/StoreConfigModal.tsx` (ou novo bloco em StoreSettings) — toggle `store_member_tracking_enabled`. Quando true, `MemberArea.tsx` mostra aba **Pedidos**; quando false, esconde. Já existe o `store_enabled`; adicionar este complementar.

---

## FASE 5 — Site Styllus (`VilaNova.tsx`)

### 5.1 Slider hero

- Adicionar mais imagens (já temos 3 — gerar 2 adicionais via IA estilo barbearia/Coqueiral)
- `object-cover` + `object-position: center` + altura responsiva fixa (`h-[60vh] sm:h-[70vh] lg:h-[80vh]`) para não cortar rostos
- Em desktop: garantir min-height 600px

### 5.2 Galeria com "Ver mais" + modal

- Manter 6 thumbs visíveis no grid
- Adicionar 6+ extras (gerar via IA — só cortes/visuais reais, sem flyer/promo)
- Botão "Ver mais" abre `<GalleryModal>` novo: grid 2/3/4 cols com scroll customizado transparente (`scrollbar-hide` ou estilizado), zoom on-click

### 5.3 Personalização → Galeria

Em `Settings.tsx` aba **Personalização**: adicionar seção "Galeria do site" — upload múltiplo de imagens (Supabase Storage `public-assets`), salvas em `business_settings.gallery_images` (JSON array de URLs). `VilaNova.tsx` lê essa key; se vazia, usa as locais como fallback.

### 5.4 "Modo do Site" surte efeito

Em Personalização já existe `site_mode` (full/booking). Garantir:
- Salvar sincroniza `barbershop_profiles.site_mode` (já faz no `handleSave`)
- Preview imediato: ao trocar, mostrar toast "Modo X ativado — visite /" 
- `HostnameResolver` já respeita; só validar fluxo end-to-end

### 5.5 Visual: logo atual

Em Personalização → Logo: mostrar preview da `logo_url` atual com botão trocar. Aplicar essa logo no header do site (atualmente VilaNova importa `brandLogo` estático — trocar para `settings.logo_url || brandLogo` como fallback).

---

## FASE 6 — Agenda-Direto: vínculo total ao admin + foto real dos profissionais

### 6.1 Profissionais reais

`AgendaDireto.tsx`:
- Substituir `MOCK_BARBERS` por fetch de `barbers` (Supabase). Já há tabela `barbers` com `avatar_url`.
- Se `avatar_url` ausente → gerar avatar IA placeholder e salvar uma única vez em Storage (admin pode trocar depois). Fallback final: iniciais coloridas.

### 6.2 Serviços reais por categoria

- Buscar `services` do banco; agrupar por nova coluna `services.category` (text, nullable, default 'geral').
- Migration: ALTER TABLE services ADD COLUMN category text DEFAULT 'geral'. Em `Services.tsx` (admin) adicionar dropdown de categoria (Cabelo / Barba / Combos / Tratamentos / Outros).
- Se vazio, fallback no MOCK_CATEGORIES atual.

### 6.3 Comodidades por barbearia

- Migration: tabela `barbershop_amenities` (id, amenity_key, active, sort_order).
- Settings ganha bloco "Comodidades" (até 4) — toggles dos `MOCK_AMENITIES.id`.
- AgendaDireto lê do banco; fallback nos defaults atuais.

### 6.4 Integração de agendamento real

Step `confirm` faz INSERT real em `appointments` (igual MemberArea), respeitando `useBookingRules`. Se `signedUserId` existe → usa email/dados da sessão; senão usa fluxo de auth (já implementado).

### 6.5 Aviso pré-confirmação

Antes do botão "Confirmar agendamento", adicionar card de aviso glass:
> "⏰ Chegue 5 min antes do horário. Em caso de atraso superior a 15 min, o atendimento pode ser remarcado."
Texto vem de `settings.late_policy` se existir; senão usa o default.

### 6.6 ChatPro confirmação

Já implementado via edge function `chatpro` (action `send_message`). Garantir uso do template `msg_on_book` / `msg_on_confirm` do admin com substituição de variáveis (`{cliente}`, `{servico}` etc.).

---

## FASE 7 — Loja → "Meus Pedidos" inteligente

`StorePage.tsx` botão "Meus Pedidos":
- Se `supabase.auth.getSession()` retorna user → abre OrderTracker já filtrando por `customer_email = user.email` (não pede telefone)
- Sem sessão → abre OrderTracker no estado atual (input de telefone)

`OrderTracker.tsx`: aceitar prop `customerEmail` e priorizar busca por email quando presente. Click no pedido abre detalhe com stepper iFood-style (já existe — só refinar visual).

---

## FASE 8 — Módulos administrativos (Fornecedores, Caixa, Comissão, Fiados, Comandas)

Hoje cada página existe mas usa MySQL como fonte. Estratégia: **Cloud-first com fallback MySQL**.

Criar `src/lib/dataSource.ts`:
```ts
export const getDataSource = () => {
  const session = getAdminMysqlSession();
  if (session?.barbershop_id && session.mysql_active) return "mysql";
  return "cloud";
};
```

### 8.1 Schema Cloud (migrations)

```
suppliers       (id, name, contact, phone, email, notes, active, created_at)
cashier_sessions(id, opened_at, closed_at, opening_amount, closing_amount, panel_user_id, notes)
cashier_movements(id, session_id, type[in/out], amount, description, category, created_at)
commissions     (id, barber_id, appointment_id, percent, amount, paid, paid_at, created_at)
credit_accounts (id, customer_name, customer_phone, balance, created_at)
credit_movements(id, account_id, type[debit/credit], amount, description, appointment_id, created_at)
commands        (id, customer_name, customer_phone, status[open/closed], total, opened_at, closed_at, panel_user_id)
command_items   (id, command_id, type[service/product], ref_id, title, price, qty)
```
Todas com RLS: admins ALL; `panel_users` com role barber só vê os próprios (filtros `panel_user_id` ou `barber_id`).

### 8.2 Refatoração das páginas

`Suppliers.tsx`, `Cashier.tsx`, `Commissions.tsx`, `Credit.tsx`, `Commands.tsx`:
- Cada uma usa `getDataSource()` para decidir
- Cloud → `supabase.from(...)`; MySQL → mantém api atual via `mysql-proxy`
- UI permanece idêntica; só a camada de dados muda
- Comissões: trigger/função que ao marcar appointment como `completed` calcula auto se `barber.commission_percent` existir

---

## FASE 9 — Polimento e segurança

- Confirmar `useDevToolsBlock` ativo em rotas públicas (já está)
- Lint Supabase: rodar `supabase--linter` ao final
- Garantir todas migrations idempotentes
- QA visual: percorrer site (mobile 390px + desktop 1280px), `/agenda-direto`, `/loja`, `/membro` e admin completo
- ChatPro template variables: implementar substituição central em `src/lib/messageTemplates.ts` (já existe — só conectar ao envio)

---

## Resumo de arquivos

**Novos:**
- `src/hooks/useBookingRules.ts`
- `src/pages/admin/Users.tsx`
- `src/components/admin/UserFormModal.tsx`
- `src/components/store/CartDrawer.tsx`
- `src/components/store/AuthRequiredModal.tsx`
- `src/components/GalleryModal.tsx`
- `src/lib/dataSource.ts`
- `src/assets/styllus/store-hero-v2.jpg` (gerada)
- `src/assets/styllus/hero-4.jpg`, `hero-5.jpg`, `gallery-7..12.jpg` (geradas)
- Várias migrations Supabase (slots, panel_users, services.category, amenities, suppliers/cashier/comissões/fiados/comandas, gallery_images settings)

**Editados:**
- `src/pages/VilaNova.tsx` (slider, galeria+modal, logo dinâmica, useBookingRules)
- `src/pages/AgendaDireto.tsx` (vínculo real, INSERT, aviso, fotos reais)
- `src/pages/MemberArea.tsx` (useBookingRules, aba pedidos, realtime)
- `src/pages/StorePage.tsx` (redesign, sem slider feio, login flow)
- `src/components/store/CheckoutModal.tsx` (pagamento na entrega, redirect)
- `src/components/store/OrderTracker.tsx` (busca por email)
- `src/components/store/StoreConfigModal.tsx` (toggle membro)
- `src/pages/admin/Settings.tsx` (slots manuais, comodidades, galeria upload, modal PIX visual)
- `src/pages/admin/Services.tsx` (campo categoria)
- `src/pages/admin/{Suppliers,Cashier,Commissions,Credit,Commands}.tsx` (Cloud fallback)
- `src/components/admin/AdminLayout.tsx` (item Usuários, ChatPro super-only)
- `src/pages/AdminLogin.tsx` (verify_panel_login)
- `src/lib/adminMysqlSession.ts` (campos role, barber_id, panel_user_id)

---

## Ordem de execução recomendada

1. **Fase 1** (regras de booking) — desbloqueia 3, 6
2. **Fase 4** (loja) — feedback visual rápido pro usuário
3. **Fase 5** (site Styllus)
4. **Fase 6** (agenda-direto)
5. **Fase 7** (Meus Pedidos inteligente)
6. **Fase 2** (Usuários multi-perfil) — maior, mas isolada
7. **Fase 8** (módulos Cloud)
8. **Fase 3** (ChatPro restrito) — 1 linha
9. **Fase 9** (polimento + lint)

Total estimado: implementação contínua — peço aprovação e sigo direto na ordem acima, fase por fase, sem parar até concluir.

**Aprova pra eu executar tudo?**
