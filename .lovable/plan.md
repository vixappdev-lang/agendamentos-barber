# Plano: WhatsApp via Render.com (Baileys) + Aba "Render" no admin

## Objetivo
Permitir conexão de um servidor Baileys hospedado no Render.com (free tier) para enviar WhatsApp 24/7 sem pagar VPS, sem usar APIs oficiais. Adicionar uma aba "Render" lado a lado com a aba ChatPro atual em `/admin/confg`, com painel de status, QR Code, configuração e envio de teste — sem mexer no fluxo ChatPro existente.

## Arquitetura

```text
[Admin Panel] -> [Edge Function: render-whatsapp] -> [Render.com Web Service (Baileys + Express)]
                                                              |
                                                       [WhatsApp Web Socket]
```

Render Free Web Service:
- 512MB RAM, dorme após 15min sem requests → resolve com cron-job.org pingando a cada 10min
- Deploy direto do GitHub (auto-deploy on push)
- Sessão Baileys salva em /tmp (perde no sleep) → fallback: salvar auth state em Supabase Storage

## Componentes a criar

### 1. Repositório Baileys (ZIP para o usuário subir no GitHub)
Pasta `render-deploy/` na raiz do projeto contendo:
- `package.json` — `@whiskeysockets/baileys`, `express`, `qrcode`, `@supabase/supabase-js`
- `server.js` — servidor Express com endpoints:
  - `GET /health` — keepalive
  - `GET /status` — status da conexão (connected/qr/disconnected)
  - `GET /qr` — retorna QR Code em base64
  - `POST /send` — body `{phone, message, secret}` → envia mensagem
  - `POST /logout` — encerra sessão
- `render.yaml` — blueprint para Render auto-detectar (free plan, Node, healthCheck `/health`)
- `.gitignore`, `README.md` com passo-a-passo:
  1. Criar conta GitHub (se não tem)
  2. Criar repo novo, fazer upload da pasta
  3. Conectar em render.com → New Web Service → conectar GitHub → selecionar repo
  4. Definir env vars (SHARED_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY)
  5. Copiar URL gerada (`https://xxx.onrender.com`)
  6. Colar no painel admin Lovable → aba Render
  7. Escanear QR Code

Persistência da sessão: salva `auth_info_baileys` JSON em tabela `render_baileys_session` no Supabase a cada update via `useMultiFileAuthState` adaptado.

### 2. Tabela Supabase
Migration nova:
```sql
create table public.render_config (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  shared_secret text not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.render_config enable row level security;
create policy "admins manage render config" on public.render_config
  for all using (has_role(auth.uid(),'admin')) with check (has_role(auth.uid(),'admin'));

create table public.render_baileys_session (
  id int primary key default 1,
  auth_state jsonb,
  updated_at timestamptz default now()
);
alter table public.render_baileys_session enable row level security;
-- só service role acessa (sem policy de usuário)
```

### 3. Edge Function `render-whatsapp`
`supabase/functions/render-whatsapp/index.ts`:
- Ações admin: `save_config`, `get_config`, `status`, `qr`, `logout`
- Ação pública: `send_message` `{phone, message}` — proxy para `${url}/send` com `shared_secret`
- CORS padrão, valida JWT admin para ações de config

### 4. Frontend — refatorar `/admin/confg`
Atualmente a página renderiza só `ChatProConfig`. Mudança:
- Criar `src/pages/admin/RenderConfig.tsx` com UI espelhada (status badge, campos URL + secret, botão salvar, painel QR Code com refresh, botão de teste enviando para um telefone digitado)
- Criar wrapper `WhatsAppProviders.tsx` com 2 abas no topo (`ChatPro` | `Render`) — sub-tabs internas estilo glass-card, não bagunçando o layout existente
- Atualizar a rota `/admin/confg` no `AdminLayout` para apontar pro wrapper

### 5. Botão de teste em `WhatsAppTemplates.tsx`
Adicionar select "Provedor" (ChatPro/Render) ao lado do campo de telefone de teste, chamando `chatpro` ou `render-whatsapp` conforme escolhido. Sem mudanças nos templates ou no envio automático.

## Limitações honestas (será exibido no card da aba Render)
- Free tier dorme após 15min sem request → adicionar instrução para configurar cron-job.org pingando `/health` (ou serviço Better Stack free)
- Sessão Baileys pode cair em cold start → salva em Supabase, recupera no boot
- Risco de ban do número WhatsApp → usar chip dedicado, não enviar em massa
- Render pode mudar política de free tier no futuro

## O que NÃO será alterado
- `chatpro` edge function
- `appointment-reminders` (continua usando ChatPro como provider principal)
- Templates, fluxo de pedidos, notificações automáticas
- Qualquer outra parte do sistema

## Entrega
Após aprovação, vou:
1. Criar migration das 2 tabelas
2. Criar edge function `render-whatsapp`
3. Criar pasta `render-deploy/` com código Baileys pronto
4. Criar `RenderConfig.tsx` + wrapper de abas
5. Atualizar `WhatsAppTemplates.tsx` com seletor de provedor
6. Documentar no README dentro de `render-deploy/` o passo-a-passo GitHub→Render

Tempo estimado de setup do usuário após código pronto: 10–15 minutos (criar repo GitHub + serviço Render + escanear QR).