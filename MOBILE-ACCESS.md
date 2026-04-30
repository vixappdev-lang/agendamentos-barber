# 📱 Acessar o app pelo celular

Existem **2 formas** de acessar o app pelo celular sem dar erro de DNS / NXDOMAIN.

---

## ✅ Forma 1 — URL pública (recomendada, sempre funciona)

O app já está publicado:

- **Lovable:** https://agendamentos-barber.lovable.app
- **Vercel:** (a URL `.vercel.app` que aparece após você rodar o deploy)

Basta abrir essa URL no navegador do celular. Funciona em qualquer rede (4G, Wi-Fi de casa, Wi-Fi do shopping, etc).

### Atualizar o deploy
```bash
bash scripts/deploy-vercel.sh
```
> Antes de usar a primeira vez: `npx vercel login`

---

## 🏠 Forma 2 — Acesso via Wi-Fi local (sem internet)

Útil quando você quer testar mudanças do dev server **sem fazer deploy**.

### Linux / Mac
```bash
bash scripts/dev-mobile.sh
```

### Windows
```cmd
scripts\dev-mobile.bat
```

O script vai:
1. Detectar o IP do PC na rede (ex: `192.168.0.105`)
2. Iniciar o Vite escutando em **todas** as interfaces (`0.0.0.0`)
3. Imprimir um **QR Code** pra escanear com o celular

### ⚠️ Por que dá erro de DNS / NXDOMAIN?

Se você tenta acessar `meu-pc:8080` ou `MEUPC.local`, o celular **não consegue resolver o nome** (NXDOMAIN = "domínio não existe"). O navegador joga o nome no Google → DNS não acha → erro.

**Solução:** SEMPRE use o **IP** (`http://192.168.x.x:8080`), nunca o nome do PC.

### Checklist se mesmo assim não funcionar

- [ ] PC e celular na **mesma rede Wi-Fi** (não pode estar um no 4G)
- [ ] **Firewall do Windows** liberando a porta 8080
  - Painel de Controle → Sistema e Segurança → Firewall do Windows Defender → Configurações Avançadas → Regras de Entrada → Nova Regra → Porta → TCP 8080 → Permitir
- [ ] **Antivírus** não bloqueando portas locais
- [ ] Wi-Fi do roteador não está com **isolamento de clientes** ativado (configuração comum em hotéis e cafés)
- [ ] Tente desabilitar Wi-Fi "público" e voltar pra "privada" (Windows pergunta isso quando conecta numa rede nova)

---

## 📲 Instalar como app no celular

Abre a URL do app no Chrome/Safari do celular → menu → **"Adicionar à tela inicial"**. Vai abrir como um app nativo, em tela cheia, com ícone próprio. Já tá tudo configurado no `manifest.json`.
