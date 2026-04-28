## Objetivo

Criar um **sistema de Perfis de Barbearias** no painel admin (super admin: `admin-barber@gmail.com`) onde cada barbearia:

1. Tem seu **próprio perfil** (nome, slug, contato, dono, login email+senha).
2. Tem seu **próprio MySQL** (host, porta, banco, usuário, senha) — obrigatório, sem mistura.
3. Recebe um **arquivo `.sql` personalizado** para baixar e importar no phpMyAdmin contendo:
   - Todas as tabelas do painel (services, appointments, etc.).
   - Tabela `users` com o **email + senha hasheada** do dono já inserido como admin.
   - Tabela `business_settings` com o nome da barbearia, slug, etc. já inseridos.
4. A barbearia atual (Vila Nova / Lovable Cloud) aparece como **perfil seed travado** (cadeado — sem editar, excluir ou trocar para MySQL).

---

## Arquitetura final

```
┌─────────────────────────────────────────────────────────────┐
│ PAINEL DO SUPER ADMIN                                        │
│  Menu lateral: ✦ Perfis Barbearias  (só super admin vê)      │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ /admin/barbershops                                     │ │
│  │   • Lista paginada (10/pág) de cards                   │ │
│  │   • Vila Nova (Cloud, 🔒 travado)                      │ │
│  │   • + Nova Barbearia                                   │ │
│  │   • Cada card: nome, dono, status MySQL, ações:        │ │
│  │       [Editar] [Configurar MySQL] [Baixar .sql]        │ │
│  │       [Testar conexão] [Ativar/Desativar] [Excluir]    │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

A aba "Banco de Dados" sai de Configurações.

---

## Schema novo: `barbershop_profiles`

```sql
CREATE TABLE public.barbershop_profiles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,            -- "vila-nova", "barbearia-joao"
  name            text NOT NULL,                   -- "Vila Nova Barbershop"
  owner_name      text,                            -- nome do dono
  owner_email     text NOT NULL,                   -- email de login do dono
  owner_password  text NOT NULL,                   -- hash bcrypt (vai pro .sql)
  phone           text,
  address         text,

  -- conexão MySQL (FK opcional)
  mysql_profile_id uuid REFERENCES public.mysql_profiles(id) ON DELETE SET NULL,

  -- flags
  is_cloud        boolean NOT NULL DEFAULT false,  -- true = roda no Cloud (caso Vila Nova)
  is_locked       boolean NOT NULL DEFAULT false,  -- true = não pode editar/excluir
  is_active       boolean NOT NULL DEFAULT true,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- RLS: só super admin (validado por e-mail no código + role admin)
ALTER TABLE public.barbershop_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin select barbershops"  ON public.barbershop_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin insert barbershops"  ON public.barbershop_profiles FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update barbershops"  ON public.barbershop_profiles FOR UPDATE USING (has_role(auth.uid(), 'admin') AND is_locked = false);
CREATE POLICY "admin delete barbershops"  ON public.barbershop_profiles FOR DELETE USING (has_role(auth.uid(), 'admin') AND is_locked = false);
```

**Senha do dono**: hasheada com **bcrypt** via função PG `crypt(senha, gen_salt('bf', 10))` (extensão `pgcrypto` já disponível). Vai assim no `.sql` exportado, pronta pra ser comparada via `password_verify` em PHP ou bcrypt em qualquer linguagem.

**Senha MySQL**: continua criptografada via `pgsodium` (já existe).

**Seed automático**: insert da Vila Nova com `is_cloud=true`, `is_locked=true`.

---

## Arquivo `.sql` gerado por barbearia

Quando o super admin clica **"📥 Baixar .sql"** num card de barbearia, é gerado um SQL **personalizado** com:

```sql
-- =====================================================================
-- Barber SaaS — {{nome da barbearia}}
-- Gerado em {{data}} pelo painel admin
-- Importe este arquivo no phpMyAdmin do banco da sua barbearia.
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- [Todas as 11 tabelas: services, barbers, appointments, products,
--  orders, order_items, coupons, business_settings, chatpro_config,
--  prize_wheel_slices, users]

-- Tabela `users` com login do dono
CREATE TABLE `users` (
  `id` CHAR(36) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,   -- bcrypt
  `name` VARCHAR(255),
  `role` ENUM('admin','barber','customer') DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seeds personalizados deste perfil
INSERT INTO `users` (`id`, `email`, `password_hash`, `name`, `role`)
VALUES ('{{uuid}}', '{{owner_email}}', '{{bcrypt_hash}}', '{{owner_name}}', 'admin');

INSERT INTO `business_settings` (`id`, `key`, `value`) VALUES
  (UUID(), 'business_name', '{{nome}}'),
  (UUID(), 'business_slug', '{{slug}}'),
  (UUID(), 'phone', '{{telefone}}'),
  (UUID(), 'address', '{{endereço}}');

SET FOREIGN_KEY_CHECKS = 1;
```

Toda vez que o perfil for editado, o `.sql` baixado reflete os novos valores. **Sem cache.**

---

## Fluxos de UI

### A) Lista `/admin/barbershops`

- Header: "Perfis de Barbearias" + botão **"+ Nova Barbearia"** (modal).
- Cards (10 por página): cada um mostra
  - Nome + slug
  - Dono (email)
  - Badge MySQL: 🟢 Conectado / ⚪ Não configurado / 🔴 Falha / ☁️ Cloud (locked)
  - Ações: **Editar**, **Configurar MySQL**, **Baixar .sql**, **Testar**, **Excluir** (desabilitado se `is_locked`).
- Paginação no rodapé (shadcn `Pagination`).
- Vila Nova fixa no topo com ícone 🔒.

### B) Modal "Nova Barbearia" / "Editar"

- Campos: nome, slug (auto-gerado a partir do nome), nome do dono, email do dono, senha do dono (mostra/esconde), telefone, endereço.
- Validação Zod: email válido, senha ≥ 8, slug `[a-z0-9-]+` único.
- Senha é hasheada via RPC `hash_owner_password(plain)` antes de salvar.

### C) Modal "Configurar MySQL"

- Reaproveita a infra do `mysql_profiles` já existente.
- Campos: host, porta, banco, usuário, senha, SSL.
- Botão **"Testar conexão"** chama `mysql-proxy { action: 'test' }`.
- Ao salvar: cria/atualiza linha em `mysql_profiles` e linka via `barbershop_profiles.mysql_profile_id`.

### D) Botão "Baixar .sql"

- Chama `generateProfileSQL(profile)` no frontend.
- Gera string SQL com schema + seeds personalizados + bcrypt hash da senha do dono.
- Download via Blob.

### E) Botão "Instalar no MySQL agora" (extra, dentro do modal MySQL)

- Após testar conexão OK, oferece "Instalar schema agora".
- Chama `mysql-proxy { action: 'install_schema', sql_text }` — executa o mesmo SQL direto no banco.

---

## Menu admin

Em `AdminLayout.tsx`, adicionar item **só para super admin**:

```tsx
{ label: "Perfis Barbearias", path: "/admin/barbershops", icon: Building2, superAdminOnly: true }
```

Filtrar `navItems` com base no e-mail do usuário logado (via `useAuth`).

Remover a seção "Banco de Dados" da página `Settings.tsx` (se foi adicionada).

---

## Arquivos novos / editados

**Novos**
- `supabase/migrations/<ts>_barbershop_profiles.sql` — tabela + RLS + seed Vila Nova + RPC `hash_owner_password`.
- `src/pages/admin/Barbershops.tsx` — lista paginada.
- `src/components/admin/BarbershopFormModal.tsx` — criar/editar perfil.
- `src/components/admin/MysqlConfigModal.tsx` — configurar MySQL do perfil.
- `src/lib/profileSqlGenerator.ts` — gera `.sql` personalizado por perfil.
- `src/hooks/useBarbershops.ts` — React Query para CRUD.
- `src/hooks/useSuperAdmin.ts` — boolean isSuperAdmin baseado no email.

**Editados**
- `src/components/admin/AdminLayout.tsx` — novo item "Perfis Barbearias" (só super admin).
- `src/App.tsx` — rota `/admin/barbershops`.
- `src/lib/sqlSchemaGenerator.ts` — adicionar tabela `users`, refatorar para receber seeds.

---

## Segurança

- Senha do dono: bcrypt (10 rounds) via `pgcrypto`.
- Senha MySQL: pgsodium AES-256 (já existe).
- RLS bloqueia tudo que não for admin; RPC `hash_owner_password` é `SECURITY DEFINER`.
- Edge function `mysql-proxy` valida super admin pelo email no JWT.
- Cards travados (`is_locked`) bloqueiam UPDATE/DELETE no banco via policy.
- Validação Zod em todos os formulários.
- Sem `dangerouslySetInnerHTML`, sem SQL livre no client.

---

## Lista de implementação (ordem)

1. ✅ Plan atualizado.
2. ⏳ **Migration** (aguardando aprovação): tabela + RLS + RPC bcrypt + seed Vila Nova.
3. ⏳ Refatorar `sqlSchemaGenerator.ts` (adicionar `users`, aceitar seeds).
4. ⏳ Criar `profileSqlGenerator.ts`.
5. ⏳ Criar hooks `useSuperAdmin`, `useBarbershops`.
6. ⏳ Criar página `Barbershops.tsx` + modais.
7. ⏳ Adicionar rota e item de menu (filtrado por super admin).
8. ⏳ Limpar Settings.tsx (se houver aba Banco de Dados).
