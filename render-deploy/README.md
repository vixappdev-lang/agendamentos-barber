# Lovable Baileys WhatsApp Server (Render.com Free)

Servidor Node.js com Baileys para conectar um número de WhatsApp e enviar mensagens via API REST. Hospedado **grátis** no Render.com Free Tier.

## ⚙️ Como subir (passo a passo, ~10 min)

### 1) Criar repositório no GitHub
1. Acesse https://github.com/new e crie um repositório (ex: `meu-whatsapp-bot`) — pode ser **privado**.
2. Faça upload de **TODOS os arquivos desta pasta** (`render-deploy/`):
   - `server.js`, `package.json`, `render.yaml`, `.gitignore`, `README.md`
3. Confirme o commit.

### 2) Criar serviço no Render.com
1. Acesse https://dashboard.render.com → cadastre-se (use GitHub para login mais rápido).
2. Clique em **New +** → **Web Service**.
3. Conecte sua conta GitHub e **selecione o repositório** que você acabou de criar.
4. Render vai detectar o `render.yaml` automaticamente. Caso não, configure manualmente:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
   - **Health Check Path**: `/health`

### 3) Variáveis de ambiente
No painel do serviço, vá em **Environment** e adicione:

| Variável | Valor |
|---|---|
| `SHARED_SECRET` | Uma senha forte qualquer (ex: `gere-no-1password-32-chars`). **GUARDE essa string!** |
| `SUPABASE_URL` | `https://vikabbqyfduibrykikvx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Pegue no painel Lovable → Cloud → Backend → Service Role Key |

> 💾 O `SUPABASE_SERVICE_KEY` permite salvar a sessão do WhatsApp no banco para sobreviver a reinícios. Sem ele, você precisará escanear o QR de novo a cada deploy.

### 4) Deploy
Clique em **Create Web Service**. O primeiro build leva ~3 minutos.
Quando terminar, copie a URL gerada (ex: `https://meu-whatsapp-bot.onrender.com`).

### 5) Conectar no painel Lovable
1. Vá em `/admin/confg` → aba **Render**.
2. Cole a **URL** do Render e o **SHARED_SECRET** que você definiu.
3. Salve. Clique em **Atualizar QR Code** e escaneie com o WhatsApp do celular (Configurações → Aparelhos conectados).
4. Status muda para **Conectado** ✅. Pronto, pode enviar mensagens.

### 6) ⚠️ Manter acordado (free tier dorme após 15min)
Cadastre o ping em https://cron-job.org (grátis):
- URL: `https://SEU-APP.onrender.com/health`
- Intervalo: a cada **10 minutos**
- Método: GET

Sem isso o serviço hiberna e a primeira mensagem demora ~30s para "acordar".

---

## 🛡️ Riscos e cuidados
- **Use um chip dedicado** (R$ 15) — não o seu pessoal. WhatsApp pode banir números que enviam mensagens automatizadas.
- **Esquente o número 7 dias** antes de enviar em massa (envie/receba conversas reais).
- **Respeite intervalos** entre mensagens (3–8 segundos) para parecer humano.
- Render Free tem 750h/mês, suficiente para 24/7 com 1 serviço.

## 🔄 Atualizar
Qualquer push no GitHub dispara redeploy automático no Render.

## 📞 Endpoints expostos
| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/health` | público | keepalive |
| GET | `/status` | x-secret | status da conexão |
| GET | `/qr` | x-secret | QR base64 para escanear |
| POST | `/send` | secret no body | envia mensagem |
| POST | `/logout` | x-secret | desconecta WhatsApp |
| POST | `/restart` | x-secret | reinicia socket |
