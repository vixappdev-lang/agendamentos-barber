
## Descoberta importante (simplifica tudo)

O projeto já tem `src/lib/adminMysqlSession.ts` instalado em `App.tsx` que **substitui transparentemente** `supabase.from(table)` por chamadas ao `mysql-proxy` quando o admin está logado num perfil MySQL e está em `/admin/*`. `business_settings` já está na lista de tabelas proxiadas.

**Consequência**: para "vincular tudo do site ao MySQL", **não preciso de driver novo nem refatorar páginas admin**. Basta:

- Salvar as configs do site em `business_settings` com chaves prefixadas `site_*`. O bridge já roteia para o MySQL do perfil ativo.
- Adicionar **uma única ação pública** no `mysql-proxy` para o site `/s/:slug` ler dados do MySQL daquele perfil sem JWT.
- Cloud só ganha 2 colunas leves para roteamento (`site_mode`, `site_published`).

---

## 1. Migration (Cloud — minimalista)

```sql
ALTER TABLE public.barbershop_profiles
  ADD COLUMN site_mode      text    NOT NULL DEFAULT 'full'
    CHECK (site_mode IN ('full','booking')),
  ADD COLUMN site_published boolean NOT NULL DEFAULT true;

CREATE INDEX barbershop_profiles_slug_pub_idx
  ON public.barbershop_profiles (slug)
  WHERE is_active = true AND site_published = true;

CREATE OR REPLACE VIEW public.barbershop_public
WITH (security_invoker=on) AS
  SELECT id, slug, name, site_mode, site_published, is_cloud, is_active
  FROM public.barbershop_profiles
  WHERE is_active = true AND site_published = true;

GRANT SELECT ON public.barbershop_public TO anon, authenticated;
```

Senha do dono, email, credenciais MySQL, permissions e is_locked **continuam fora da view** — só super-admin vê.

---

## 2. Edge function — nova ação `public_query`

Em `supabase/functions/mysql-proxy/index.ts`, adicionar **antes** do bloco de auth:

```ts
if (action === "public_query") {
  // Sem JWT. Whitelist rígida de sub-actions read-only/booking.
  const slug = String(body.slug || "").toLowerCase().trim();
  const sub  = String(body.sub  || "").trim();
  const ALLOWED_SUB = new Set([
    "site_settings",   // SELECT key,value FROM business_settings WHERE key LIKE 'site_%' OR key IN (...)
    "services",        // services ativos
    "barbers",         // barbers ativos
    "products",        // products ativos
    "reviews_public",  // reviews status=approved is_public=1
    "create_appointment",
    "create_order",
    "create_review",
  ]);
  if (!ALLOWED_SUB.has(sub)) throw new Error("sub não permitida");

  // Resolve barbearia + MySQL via service role
  const { data: shop } = await admin
    .from("barbershop_profiles")
    .select("id, slug, mysql_profile_id, is_active, site_published, is_cloud")
    .eq("slug", slug)
    .maybeSingle();
  if (!shop || !shop.is_active || !shop.site_published) {
    return json({ success:false, code:"NOT_FOUND" });
  }
  if (shop.is_cloud) {
    // Vila Nova → Cloud, devolve hint para o front consultar Supabase direto
    return json({ success:true, source:"cloud" });
  }
  if (!shop.mysql_profile_id) {
    return json({ success:false, code:"NOT_CONFIGURED" });
  }

  const profile = await getProfile(admin, shop.mysql_profile_id);
  const password = await decryptPassword(admin, profile.password_encrypted);
  const conn = await connectMysql(profile, password);
  try {
    // SQL fixo por sub-action, parâmetros via prepared statements.
    // Validação Zod por sub. Nunca aceita SQL livre.
    ...
  } finally { await conn.end(); }
}
```

Cada sub-action tem SQL fixo no servidor:
- `site_settings` → `SELECT key,value FROM business_settings WHERE key IN (whitelist de chaves site_*)`
- `services` → `SELECT * FROM services WHERE active=1 ORDER BY sort_order`
- `create_appointment` → valida payload com Zod estrito, faz `INSERT` parametrizado, retorna id

---

## 3. Aba "Site" nas Configurações (organizada)

Em `src/pages/admin/Settings.tsx`:

1. Adicionar `{ id: "site", label: "Site", icon: Globe }` ao array `tabs` (entre "personalization" e "hours").
2. Renderizar `<SettingsSiteTab settings={settings} updateSetting={updateSetting} barbershop={...} />` quando `activeTab === "site"`.

Novo `src/components/admin/SettingsSiteTab.tsx` — **8 sub-cards organizados em accordion**, layout 2-colunas no desktop:

```
┌─ 📡 Publicação ───────────────────────────────────┐
│  • Switch: Site publicado                         │
│  • Radio: Site Completo / Agendamento Direto      │
│  • URL pública: app.com/s/<slug>  [📋] [↗]        │
│  (Salva site_mode/site_published via Supabase     │
│   direto — Cloud, pois é roteamento)              │
└───────────────────────────────────────────────────┘

┌─ 🎨 Identidade Visual ────────────────────────────┐
│  • Logo (upload)        • Favicon (upload)        │
│  • Color: Primária / Acento / Fundo               │
│  • Select: Fonte títulos / Fonte corpo            │
│  → site_logo_url, site_favicon_url, site_primary, │
│    site_accent, site_bg, site_font_heading,       │
│    site_font_body                                 │
└───────────────────────────────────────────────────┘

┌─ 🖼 Hero ─────────────────────────────────────────┐
│  • Título / Subtítulo / Descrição                 │
│  • Imagens (upload múltiplo + reorder)            │
│  → site_hero_title, site_hero_subtitle,           │
│    site_hero_description, site_hero_images (JSON) │
└───────────────────────────────────────────────────┘

┌─ 📖 Sobre ───────┐  ┌─ 🌆 Galeria ───────────────┐
│  • Título        │  │  • Upload múltiplo         │
│  • Descrição     │  │  → site_gallery (JSON)     │
└──────────────────┘  └────────────────────────────┘

┌─ 📞 Contato ─────┐  ┌─ 🕐 Horários ──────────────┐
│  • WhatsApp      │  │  • Abre / Fecha            │
│  • Instagram     │  │  • Almoço início/fim       │
│  • Endereço      │  │  • Dias off (chips)        │
│  • Maps link     │  │                            │
└──────────────────┘  └────────────────────────────┘

┌─ 🔍 SEO ───────────────────────────────────────────┐
│  • Title • Description • OG image                  │
└────────────────────────────────────────────────────┘

[👁 Abrir prévia]   [💾 Salvar tudo]   Salvo • há 2s
```

**Onde os dados vão**:
- `site_mode`, `site_published` → `barbershop_profiles` (Cloud, roteamento).
- **Todo o resto** (`site_*` em `business_settings`) → MySQL do perfil via bridge (zero código novo, zero peso no Cloud).

---

## 4. Rotas públicas `/s/:slug/*`

`src/components/TenantResolver.tsx`:
1. Lê `barbershop_public` por slug.
2. Se não achou → 404 amigável.
3. Carrega `site_settings` (todas as chaves `site_*` + `business_name`, `whatsapp_number`, etc.) via `public_query`.
4. Aplica `<ThemeApplier>`: CSS vars, favicon, `<title>`.
5. Provê `<TenantSiteContext>` com `{ profile, site, source }`.

`src/App.tsx`:
```tsx
<Route path="/s/:slug" element={<TenantResolver/>}>
  <Route index            element={<TenantSite/>}/>     {/* full ou redirect */}
  <Route path="agenda"    element={<TenantBooking/>}/>
  <Route path="loja"      element={<TenantStore/>}/>
  <Route path="avaliacao" element={<TenantReview/>}/>
</Route>
```

`TenantSite`:
- Se `site_mode === "booking"` → `<Navigate to="agenda" replace/>`.
- Senão renderiza landing dinâmica reaproveitando os componentes de `VilaNova.tsx` e `LandingExtras.tsx`, alimentada por `useSiteSettings()`.

`TenantBooking`, `TenantStore`, `TenantReview` são wrappers finos que reaproveitam os componentes existentes (`BookingFlow`, `ProductCard`, etc.) usando `useTenantSite().createAppointment / createOrder / createReview` (que chamam `public_query`).

---

## 5. Seeds no `.sql` exportado

Em `src/lib/profileSqlGenerator.ts`, no array `settings`, adicionar:

```ts
["site_mode",          "full"],
["site_published",     "true"],
["site_hero_title",    p.name],
["site_hero_subtitle", "Barbearia Premium"],
["site_hero_description", "Cortes modernos e atendimento de excelência"],
["site_about_title",   "Sobre nós"],
["site_about_description", ""],
["site_hero_images",   "[]"],
["site_gallery",       "[]"],
["site_primary",       "#6E59F2"],
["site_accent",        "#8B7AFE"],
["site_bg",            "#0F1117"],
["site_font_heading",  "Playfair Display"],
["site_font_body",     "Inter"],
["site_logo_url",      ""],
["site_favicon_url",   ""],
["site_seo_title",     p.name],
["site_seo_description", ""],
["site_seo_og_image",  ""],
["opening_time",       "09:00"],
["closing_time",       "19:00"],
["lunch_start",        "12:00"],
["lunch_end",          "13:00"],
["days_off",           "0"],
```

Tudo em `business_settings` — não cria tabela nova, retrocompatível.

---

## 6. Segurança

- View `barbershop_public` esconde senha, email, credenciais, permissions.
- `public_query` whitelist de sub-actions, SQL fixo por sub, prepared statements, Zod estrito por sub.
- `create_appointment/order/review` valida tamanhos, formatos (telefone, data HH:mm, rating 1-5), captcha-ready (campo honeypot).
- Sanitização de cores (`/^#[0-9a-f]{6}$/i`), URLs (`^https?://`), times (`^\d{2}:\d{2}$`).
- `site_published=false` ⇒ slug retorna 404 público (preview interno usa rota admin).
- Admin-MySQL bridge já valida sessão HMAC; só dono daquele perfil escreve nas chaves `site_*` daquele MySQL.

---

## 7. Arquivos

**Migration**: `supabase/migrations/<ts>_barbershop_site_routing.sql`

**Edge editado**: `supabase/functions/mysql-proxy/index.ts` (+bloco `public_query` com whitelist).

**Frontend novo**:
- `src/components/admin/SettingsSiteTab.tsx` — aba completa, 8 sub-cards.
- `src/components/TenantResolver.tsx` — resolve slug + ThemeApplier.
- `src/contexts/TenantSiteContext.tsx` — provider com `{profile, site, ...mutations}`.
- `src/hooks/useSiteSettings.ts` — get/update via supabase ou public_query.
- `src/pages/tenant/TenantSite.tsx` — landing dinâmica.
- `src/pages/tenant/TenantBooking.tsx`, `TenantStore.tsx`, `TenantReview.tsx`.

**Frontend editado**:
- `src/App.tsx` — rotas `/s/:slug/*`.
- `src/pages/admin/Settings.tsx` — nova tab "Site".
- `src/lib/profileSqlGenerator.ts` — seeds `site_*`.
- `src/hooks/useBarbershops.ts` — incluir `site_mode`, `site_published` no tipo + update.

---

## 8. Ordem de execução

1. Migration `barbershop_site_routing`.
2. Estender `mysql-proxy` com `public_query` + sub-actions whitelisted.
3. Estender `profileSqlGenerator` com seeds `site_*`.
4. Criar `SettingsSiteTab` + plugar em `Settings.tsx` como nova tab.
5. Criar `TenantResolver` + `TenantSiteContext` + `useSiteSettings`.
6. Criar `TenantSite` (landing) + `TenantBooking/Store/Review` (wrappers).
7. Adicionar rotas `/s/:slug/*` em `App.tsx`.
8. Smoke test: criar perfil → MySQL → editar Site → publicar → `/s/<slug>` (full + booking).

Resultado: cada barbearia tem **site público próprio**, **isolado por MySQL**, **personalizável numa aba dedicada**, **zero peso adicional no Cloud**, e Vila Nova continua intacta.
