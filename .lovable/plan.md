
## 1. Fix booking final step (tela dark / não agenda) — global

**Root cause investigation found two issues:**

- `BookingFlow.tsx` calls `supabase.from("appointments").insert(...)` without `.select()` and only destructures `error`. On tenant domains the `tenantPublicBridge` routes this through `create_appointment`, but if the edge function call fails or never resolves, no toast is shown — `setSubmitting(false)` is never called and the modal stays in a half-rendered "dark" state.
- The success modal (`showConfirmation`) uses `t.overlayBg` + `glass-card-strong`. Edge function logs (`mysql-proxy`) show **zero** `create_appointment` invocations, confirming the call is silently swallowed (likely thrown by the bridge before reaching the function — e.g. tenant context not active when click happens, or `then`/`await` chain swallowing).

**Fixes:**

1. **`src/components/BookingFlow.tsx`** — wrap insert in `try/catch`, always reset `setSubmitting(false)`, log the real error to console, and show explicit toast on every failure path. Use the tenant `publicQuery` directly when available (via a small `useTenantSiteSafe()` helper) instead of relying solely on the bridge — this removes one layer of indirection on tenant domains.
2. Add a final guard: if `setShowConfirmation(true)` runs but the modal can't paint (no theme), show a plain success card fallback.
3. **`src/lib/tenantPublicBridge.ts`** — make `PublicInsertQuery.then` always resolve with `{data, error}` (never throw), so awaits never hang. Add `console.error` on bridge failures.
4. **`supabase/functions/mysql-proxy/index.ts`** — return a structured error JSON (status 200) for `create_appointment` instead of throwing, so the client always gets `{error: {...}}`.

This normalizes booking for every tenant (cloud + mysql, custom domain + subdomain + lovable preview).

## 2. New commercial site at `/lynecloud`

A modern, animated SaaS landing page to sell the platform. Built with Framer Motion, Tailwind, and the existing dark glassmorphism design language.

**Route:** add `/lynecloud` to `src/App.tsx` (lazy-loaded, public, no tenant wrapper).

**File:** `src/pages/LyneCloud.tsx`

**Sections (top to bottom):**

```text
┌─────────────────────────────────────────┐
│ Sticky nav (logo · recursos · planos)   │
├─────────────────────────────────────────┤
│ HERO                                    │
│  - H1 animado (fade+slide)              │
│  - Subtítulo "Gestão inteligente..."    │
│  - CTAs: "Começar agora" / "Ver demo"   │
│  - Mockup do painel real (parallax)     │
├─────────────────────────────────────────┤
│ FEATURES (grid 3x2 com ícones)          │
│  Automação · Agenda · Financeiro ·      │
│  Loja · Comissões · Fidelidade          │
├─────────────────────────────────────────┤
│ SHOWCASE PAINEL (real)                  │
│  Screenshots reais de Dashboard,        │
│  Finance, Appointments, Cashier         │
│  com tabs animadas                      │
├─────────────────────────────────────────┤
│ MOBILE APP-LIKE (agendamento)           │
│  Frame de celular com screenshots       │
│  reais do BookingFlow mobile            │
├─────────────────────────────────────────┤
│ PLANO ÚNICO (card destaque)             │
│  R$ 150/mês · lista de recursos         │
│  CTA grande "Quero contratar"           │
├─────────────────────────────────────────┤
│ FAQ + Footer                            │
└─────────────────────────────────────────┘
```

**Real screenshots (não recriar do zero):**
Capturar via `browser--navigate_to_sandbox` + `browser--screenshot` as seguintes telas, salvar em `src/assets/lynecloud/`:
- `dashboard.png` — `/admin` (1366×768)
- `finance.png` — `/admin/finance`
- `appointments.png` — `/admin/appointments`
- `cashier.png` — `/admin/cashier`
- `mobile-booking-1.png` — `/` em viewport 390×844, abrir BookingFlow step 0
- `mobile-booking-2.png` — step 2 (data/hora)
- `mobile-booking-3.png` — confirmação

**Plano (R$ 150/mês) — recursos listados:**
- Agenda inteligente com confirmação automática
- Notificações automatizadas para clientes
- Painel financeiro completo (caixa, comissões, créditos)
- Loja online integrada (delivery + retirada)
- Comandas e estoque
- Roleta de prêmios e cupons
- Site personalizado com domínio próprio
- Avaliações públicas automáticas
- Multi-barbeiro com escalas
- Suporte prioritário

(Sem citar ChatPro — apenas "automação".)

**Design / animações:**
- Dark theme consistente (`hsl(220 25% 6%)`), gradientes sutis com `accentPurple`.
- Framer Motion: `whileInView` fade+slide para cada seção, `motion.div` parallax no mockup do hero, hover-scale nos cards de feature, `AnimatePresence` para tabs do showcase.
- Mockup de celular SVG inline envolvendo o screenshot mobile.
- Sticky nav com blur ao scroll.
- Botão "Quero contratar" abre WhatsApp (`wa.me/<número>`) — usar número do `business_settings` admin global (ou hardcode placeholder a confirmar).

**Sem backend novo:** página é 100% estática. Conversão via WhatsApp / e-mail.

## 3. Detalhes técnicos

- `src/App.tsx`: adicionar `<Route path="/lynecloud" element={<LyneCloud />} />` fora do `HostnameResolver` para evitar resolução de tenant.
- Lazy-load: `const LyneCloud = lazy(() => import("./pages/LyneCloud"))`.
- Imports de imagens via `import dashImg from "@/assets/lynecloud/dashboard.png"` para hash do Vite.
- Não tocar em `src/integrations/supabase/*`.
- SEO: `<title>` e meta description dentro de `<Helmet>`-style (ou direto no `useEffect`).

## Arquivos editados/criados

- ✏️ `src/components/BookingFlow.tsx` (fix do bug)
- ✏️ `src/lib/tenantPublicBridge.ts` (resilience)
- ✏️ `supabase/functions/mysql-proxy/index.ts` (erro estruturado)
- ✏️ `src/App.tsx` (rota nova)
- ➕ `src/pages/LyneCloud.tsx`
- ➕ `src/assets/lynecloud/*.png` (capturas reais)

## O que NÃO será feito

- Não vou recriar imagens do painel via IA — todos screenshots são captura real do app.
- Não vou alterar autenticação ou RLS.
- Não vou adicionar checkout de pagamento ainda (CTA é WhatsApp). Se quiser, posso integrar Lovable Payments num próximo passo.
