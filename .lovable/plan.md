
# Plano: Fase 11 + Fase 19 + Acesso Mobile via Wi-Fi

Vou entregar 3 coisas independentes em uma só rodada.

---

## 🧾 Fase 11 — Relatório Financeiro PDF Mensal

### O que será feito
- Geração de **PDF mensal** com a marca da barbearia, contendo:
  - Cabeçalho (logo + nome + período)
  - Resumo: Receita, Despesas, Lucro líquido, Nº de atendimentos, Ticket médio, Vendas da loja
  - Gráfico/tabela de receita por dia
  - Top serviços
  - Ranking de barbeiros (faturamento + atendimentos)
  - Rodapé "assinado por" (nome do dono/barbeiro logado + data)
- Botão **"Baixar relatório PDF"** no `Finance.tsx` (já tem ícone `Download` importado)
- Seletor de mês (ex: Outubro/2026, Novembro/2026)

### Como (técnico)
- Lib: **`jspdf` + `jspdf-autotable`** (client-side, sem custo de edge function, evita Python/skill PDF que só roda no sandbox e não no app do usuário)
- Novo arquivo: `src/lib/generateFinanceReport.ts` — função pura que recebe `stats`, `appointments`, `barberRanking`, `topServices`, `period` e devolve um `Blob`
- Reaproveita os dados que `Finance.tsx` já busca, só adiciona um filtro de mês específico
- Logo: lê `business_settings.logo_url` se existir

### Sem mexer em
- Estrutura do banco (zero migração)
- Layout existente do Finance — só adiciona um botão e um `<select>` de mês

---

## 📅 Fase 19 — Integração Google Calendar (sync bidirecional)

### O que será feito
- Cada **barbeiro** pode conectar a própria conta Google em "Configurações"
- Ao **confirmar** um agendamento → cria evento no Google Calendar do barbeiro
- Ao **cancelar/reagendar** → atualiza/remove o evento
- (Opcional fase futura: sync inverso Google → app)

### Como (técnico)

**1. Banco (1 migração pequena)**
```sql
CREATE TABLE public.google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id uuid NOT NULL,
  barber_name text NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  calendar_id text DEFAULT 'primary',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointments ADD COLUMN google_event_id text;
```
- RLS: só admin lê/escreve tokens (admins gerenciam). Evita escopo público.

**2. Secrets a pedir ao usuário**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (será a URL da edge function de callback)

**3. Edge functions novas**
- `google-oauth-start` → gera URL de consent do Google
- `google-oauth-callback` → troca `code` por tokens, salva em `google_calendar_tokens`
- `google-calendar-sync` → recebe `{appointment_id, action: 'create'|'update'|'delete'}`, faz refresh de token se preciso, chama API do Calendar

**4. Frontend**
- Nova aba em `/admin/settings`: **"Google Calendar"** com botão "Conectar conta Google" (por barbeiro)
- Em `Appointments.tsx` `updateStatus`: depois do WhatsApp, dispara `google-calendar-sync`
- Estado visual: ✅ conectado / ⚠️ desconectado por barbeiro

### O que vou pedir ao usuário antes de implementar
- As 3 secrets do Google Cloud Console (vou explicar passo a passo como criar o OAuth Client)

---

## 📱 Acesso Mobile via Wi-Fi (sem erro de DNS / NXDOMAIN)

### O problema que você descreveu
Quando tenta abrir o app pelo celular na mesma rede Wi-Fi do PC, dá erro de DNS / `NXDOMAIN`. Isso acontece porque:
- O dev server roda em `localhost` (só o PC enxerga)
- Ou o Vite escuta só em `127.0.0.1`, não no IP da rede local
- Ou o domínio Lovable depende de internet (não funciona offline na LAN)

### Solução proposta
Como o app **já está publicado na Vercel** (`vercel.json` existe), o caminho real é garantir que ele seja acessível por:

**A) Acesso pela URL pública da Vercel (recomendado, sempre funciona)**
- Criar arquivo `MOBILE-ACCESS.md` na raiz com instruções claras de como acessar pelo celular usando a URL `.vercel.app` ou domínio custom
- Ajustar `vercel.json` para garantir headers corretos de CORS e cache para mobile

**B) Acesso via LAN local (Wi-Fi sem internet)**
- Criar script `scripts/dev-mobile.sh` (ou `.bat` pra Windows) que:
  - Detecta o IP local da máquina (`192.168.x.x`)
  - Roda `vite --host 0.0.0.0 --port 8080`
  - Imprime QR Code do endereço `http://192.168.x.x:8080` pra escanear no celular
- Ajusta `vite.config.ts` adicionando `server: { host: '0.0.0.0', port: 8080 }`
- Cria `scripts/deploy-vercel.sh` simples que roda `vercel --prod` (caso queira atualizar via CLI)

**C) PWA leve (só manifest, sem service worker)**
- Atenção: já existe `public/notifications-sw.js` registrado pelas push notifications. **NÃO vou adicionar `vite-plugin-pwa`** (cacheia e quebra preview)
- Só vou adicionar `public/manifest.json` + ícones + `<link rel="manifest">` no `index.html`
- Resultado: dá pra "Adicionar à tela de início" no celular e abre como app, sem cache problemático

### Sem mexer em
- O service worker de notificações que já existe
- Configuração de auth/OAuth

---

## 📦 Arquivos que serão criados/editados

**Fase 11:**
- ➕ `src/lib/generateFinanceReport.ts`
- ✏️ `src/pages/admin/Finance.tsx` (botão + seletor mês)
- ➕ deps: `jspdf`, `jspdf-autotable`

**Fase 19:**
- ➕ migração SQL (tabela tokens + coluna `google_event_id`)
- ➕ `supabase/functions/google-oauth-start/index.ts`
- ➕ `supabase/functions/google-oauth-callback/index.ts`
- ➕ `supabase/functions/google-calendar-sync/index.ts`
- ✏️ `supabase/config.toml` (3 funções com `verify_jwt` adequado)
- ✏️ `src/pages/admin/Settings.tsx` (nova aba Google Calendar)
- ✏️ `src/pages/admin/Appointments.tsx` (dispara sync no `updateStatus`)
- 🔐 secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Mobile:**
- ➕ `MOBILE-ACCESS.md` (guia passo a passo)
- ➕ `scripts/dev-mobile.sh` + `scripts/dev-mobile.bat`
- ➕ `scripts/deploy-vercel.sh`
- ✏️ `vite.config.ts` (host 0.0.0.0)
- ✏️ `vercel.json` (headers CORS leves)
- ➕ `public/manifest.json` (PWA leve, só manifest)
- ✏️ `index.html` (link do manifest)

---

## ❓ Antes de começar, preciso confirmar 1 coisa

Pra Fase 19 funcionar, vou precisar das credenciais do Google. **Você já tem um projeto no Google Cloud Console com OAuth Client criado?**
- Se **sim** → me manda o `CLIENT_ID` e `CLIENT_SECRET` quando eu pedir
- Se **não** → eu te passo um passo-a-passo curtinho de como criar (leva uns 3 minutos)

Se quiser que eu **comece já pelas Fases 11 e Mobile** (que não precisam de credencial nenhuma) e a Fase 19 entra logo depois quando você tiver as keys, é só falar.

**Aprovar este plano pra eu seguir?**
