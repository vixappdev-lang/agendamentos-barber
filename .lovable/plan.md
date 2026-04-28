## Objetivo

Transformar a aba **Configurações → Banco de Dados** em um sistema completo de **MySQL próprio multi-tenant**, onde:

1. Cada barbearia (cliente) cria/conecta o **seu próprio MySQL** (cPanel, phpMyAdmin, etc.).
2. Quando conectado, **todo o painel passa a salvar lá** (agendamentos, serviços, barbeiros, produtos, cupons, configurações, ChatPro, roleta, pedidos).
3. Há um **botão para baixar o `.sql`** com TODAS as tabelas prontas para importar no phpMyAdmin.
4. Suporte a **vários perfis de conexão** (uma por barbearia/cliente), sem zerar nada do que já existe — você troca de perfil ativo e o painel reflete os dados daquele cliente.
5. Indicador visual: painel mostra "🟢 Conectado: Barbearia X" quando o MySQL está ativo, ou "☁️ Lovable Cloud" como padrão.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────┐
│  PAINEL ADMIN (React)                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ DataSourceContext (escolhe origem ativa)           │  │
│  │   ├─ "cloud"    → Supabase (padrão / fallback)     │  │
│  │   └─ "mysql:ID" → Edge Function → MySQL do cliente │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
            ┌─────────────┴─────────────┐
            ▼                           ▼
   ┌──────────────────┐       ┌──────────────────────┐
   │ Supabase (Cloud) │       │ Edge Function        │
   │ — sempre ativo   │       │ "mysql-proxy"        │
   │ — guarda perfis  │       │ — conecta no MySQL   │
   │   de conexão     │       │   do cliente via TCP │
   └──────────────────┘       └──────────┬───────────┘
                                         ▼
                              ┌─────────────────────┐
                              │ MySQL do Cliente    │
                              │ (cPanel/phpMyAdmin) │
                              └─────────────────────┘
```

**Os perfis de conexão (host, user, senha, etc.) ficam no Supabase** (criptografados), nunca no localStorage. Assim você pode acessar de qualquer dispositivo e os dados de cada barbearia ficam isolados.

---

## Etapas de implementação

### 1. Schema novo no Supabase (migração)

Criar a tabela `mysql_profiles` para armazenar múltiplos perfis de conexão:

```sql
CREATE TABLE public.mysql_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,              -- "Barbearia João", "Barbearia Centro"
  host text NOT NULL,
  port integer DEFAULT 3306,
  database_name text NOT NULL,
  username text NOT NULL,
  password_encrypted text NOT NULL,   -- AES-256 via pgsodium
  ssl_enabled boolean DEFAULT false,
  is_active boolean DEFAULT false,    -- só 1 ativo por vez
  last_test_at timestamptz,
  last_test_status text,              -- 'ok' | 'fail'
  last_test_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: só admin
ALTER TABLE public.mysql_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage mysql_profiles" ON public.mysql_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'));
```

Senha do MySQL é criptografada usando `pgsodium` antes de gravar; descriptografada apenas dentro da Edge Function.

### 2. Edge Function `mysql-proxy`

Função única que recebe `{ profile_id, action, table, data, filters }` e executa no MySQL do cliente.

- Carrega o perfil ativo (ou o `profile_id` informado).
- Descriptografa a senha.
- Conecta no MySQL via driver Deno (`npm:mysql2`).
- Mapeia `action` → SQL parametrizado: `select`, `insert`, `update`, `delete`, `upsert`, `count`.
- Whitelist de tabelas permitidas (sem SQL arbitrário do cliente).
- Retorna `{ success, data, error }` no mesmo formato do Supabase.

Endpoints adicionais:
- `action: "test"` → faz `SELECT 1` e devolve latência + versão MySQL.
- `action: "install_schema"` → roda o SQL completo de criação no banco vazio.
- `action: "stats"` → conta linhas por tabela (mostrar no card "Conectado").

### 3. Camada de abstração `dataSource.ts` (frontend)

Novo arquivo `src/lib/dataSource.ts`:

```ts
// API espelhada do supabase-js, mas roteia conforme perfil ativo
dataSource.from("appointments").select()...
dataSource.from("services").insert(...)
```

- Lê `active_profile_id` do localStorage + valida no Supabase.
- Se `null` → usa `supabase` direto (cloud).
- Se setado → chama a edge function `mysql-proxy`.
- Mesma assinatura para que **substituamos `import { supabase }` por `import { db }` apenas nas páginas do admin** sem reescrever lógica.

Páginas que serão migradas para usar `db` (e portanto MySQL quando ativo):
- `admin/Appointments.tsx`
- `admin/Services.tsx`
- `admin/Barbers.tsx`
- `admin/Products.tsx`
- `admin/Coupons.tsx`
- `admin/Orders.tsx`
- `admin/Settings.tsx` (business_settings)
- `admin/ChatProConfig.tsx`
- `admin/PrizeWheelConfig.tsx`
- `admin/Dashboard.tsx` / `StoreDashboard.tsx` / `Finance.tsx` (leituras)
- `BookingFlow.tsx` (criação de agendamento pelo cliente final)

O **site público** (VilaNova) continua lendo do MySQL ativo via mesma camada — assim os clientes finais agendam direto no banco do dono.

### 4. Aba "Banco de Dados" reformulada (`Settings.tsx`)

Substitui a aba atual por 3 sub-seções:

**A) Perfis de Conexão (lista)**
- Card por perfil com: nome, host mascarado, status (🟢/🔴/⚪), botão **"Ativar"**, **"Editar"**, **"Testar"**, **"Excluir"**.
- Botão **"+ Novo Perfil"** abre modal com: nome, host, porta, banco, usuário, senha, SSL.
- Apenas 1 ativo por vez. Trocar de ativo recarrega o painel com os dados do novo banco.

**B) Status & Estatísticas (perfil ativo)**
- Quando há perfil ativo: card grande "🟢 Conectado: Barbearia X" mostrando latência, versão MySQL, contagem por tabela, último teste.
- Botão "Voltar para Lovable Cloud" (desativa todos os perfis).

**C) SQL Schema & Migração**
- Botão **"📥 Baixar SQL completo"** → gera e baixa `barber-saas-schema.sql` com:
  - `CREATE DATABASE IF NOT EXISTS` (comentado, opcional)
  - `CREATE TABLE` para todas as 11 tabelas (appointments, barbers, business_settings, chatpro_config, coupons, products, services, orders, order_items, prize_wheel_slices, user_roles)
  - Índices, FKs, valores default equivalentes ao Supabase.
  - INSERTs de seed (linha admin, configurações iniciais opcionais).
- Botão **"⚡ Instalar schema agora"** → executa o SQL diretamente via edge function no banco do perfil ativo (para quem não quer usar phpMyAdmin).
- Botão **"📤 Migrar dados Cloud → MySQL"** → copia tudo do Supabase atual para o MySQL ativo (por tabela, com barra de progresso). Sem zerar nada: usa `INSERT ... ON DUPLICATE KEY UPDATE`.

### 5. Geração do arquivo `.sql`

Função utilitária `src/lib/sqlSchemaGenerator.ts` que monta o texto SQL a partir de uma definição central de tabelas. Compatível com **MySQL 5.7+ / MariaDB 10+** (charset `utf8mb4`, engine `InnoDB`). Exemplo de saída resumida:

```sql
CREATE TABLE `appointments` (
  `id` CHAR(36) NOT NULL DEFAULT (UUID()),
  `customer_name` VARCHAR(255) NOT NULL,
  `customer_phone` VARCHAR(50),
  `service_id` CHAR(36),
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NOT NULL,
  `status` VARCHAR(20) DEFAULT 'pending',
  `total_price` DECIMAL(10,2),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_date` (`appointment_date`),
  CONSTRAINT `fk_service` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

O download é gerado 100% no frontend (sem backend) via `Blob` + `URL.createObjectURL`.

### 6. Indicador global no admin

`AdminLayout.tsx` ganha um badge no topo:
- ☁️ **Lovable Cloud** (cinza) — nenhum perfil ativo.
- 🟢 **MySQL: Barbearia X** (verde) — perfil ativo e saudável.
- 🔴 **MySQL: Barbearia X (offline)** (vermelho) — perfil ativo mas teste falhou; cai para Cloud automaticamente e avisa.

### 7. Segurança

- Senhas MySQL criptografadas no Postgres (pgsodium).
- Edge function valida JWT do admin antes de qualquer operação.
- Whitelist de tabelas/ações na edge function (sem SQL livre).
- Queries parametrizadas (`mysql2` placeholders) — sem injeção.
- Logs sanitizados (nunca printar senha).

---

## Detalhes técnicos resumidos

| Item | Implementação |
|------|---------------|
| Multi-perfil | Tabela `mysql_profiles` + flag `is_active` única |
| Sem zerar dados | Migração usa `ON DUPLICATE KEY UPDATE`, nunca `TRUNCATE` |
| Troca de perfil | `setActiveProfile(id)` invalida React Query cache e recarrega |
| Fallback | Se MySQL falhar 2x seguidas, retorna automaticamente para Cloud com toast |
| Site público | Também respeita perfil ativo (cliente final agenda direto no MySQL do dono) |
| Compatibilidade | MySQL 5.7+, MariaDB 10+, charset utf8mb4 |

---

## Arquivos que serão criados/editados

**Novos**
- `supabase/migrations/<timestamp>_mysql_profiles.sql`
- `supabase/functions/mysql-proxy/index.ts`
- `src/lib/dataSource.ts` — abstração cloud↔mysql
- `src/lib/sqlSchemaGenerator.ts` — gera o `.sql`
- `src/contexts/DataSourceContext.tsx` — perfil ativo global
- `src/components/admin/MysqlProfileModal.tsx` — modal criar/editar perfil
- `src/components/admin/MysqlStatusBadge.tsx` — badge do header

**Editados**
- `src/pages/admin/Settings.tsx` — aba "Banco de Dados" totalmente nova
- `src/components/admin/AdminLayout.tsx` — badge de status
- Páginas admin listadas no item 3 — trocar `supabase` por `db`
- `src/App.tsx` — envolver com `DataSourceProvider`

---

## Lista de confirmações antes de eu codar

Por favor confirme/ajuste:

1. **Senha MySQL**: criptografar via `pgsodium` no Supabase (recomendo). OK?
2. **Migração de dados Cloud→MySQL**: incluir como botão na aba (recomendo) ou deixar manual via SQL?
3. **Site público (cliente final)** também deve usar o MySQL do perfil ativo, ou só o painel admin?
4. **Cair para Cloud automaticamente** se o MySQL ficar offline, ou bloquear o painel até reconectar?

Após sua resposta, implemento tudo na sequência.