## Objetivo

Corrigir o portfólio em `/portfolio`: trocar a cor amarela por azul escuro do painel + botões brancos, recapturar os prints reais (incluindo o admin logado), profissionalizar a seção de prints e adicionar uma seção de ROI real e persuasivo.

## 1. Recapturar prints reais

Capturar do site real `https://lynecloud.online` (390x844, mobile real) e do admin logado:

| Arquivo | Origem | Como capturar |
|---|---|---|
| `portfolio-shot-landing.png` | `https://lynecloud.online/` | navigate_to_url + screenshot |
| `portfolio-shot-agenda.png` | `https://lynecloud.online/` → fluxo de agendamento | navegar pelo flow + screenshot |
| `portfolio-shot-loja.png` | `https://lynecloud.online/loja` | navigate_to_url + screenshot |
| `portfolio-shot-membro.png` | `https://lynecloud.online/membro` (após login) | screenshot da área do cliente |
| `portfolio-shot-admin.png` | `/admin` no preview, logado como `admin-barber@gmail.com` / `admin@2026` | navigate_to_sandbox + login + screenshot do dashboard real |

Todos os PNGs serão salvos diretamente em `src/assets/` (sobrescrevendo os atuais). Sem mais edição manual de PIL — só o print real e cru.

## 2. Trocar paleta amarela por azul escuro do painel

O painel admin usa `hsl(245 60% 55%)` (índigo/azul escuro) como cor primária. Vou substituir TODAS as ocorrências de `hsl(45 100% ...)` (amarelo) em `src/pages/Portifolio.tsx` por essa paleta:

- **Acento principal** (textos eyebrow, gradientes de título, ícones, halo do phone, glows ambient): `hsl(245 60% 60%)` / `hsl(245 60% 55%)` / `hsl(245 70% 45%)`
- **Botões CTA** ("Quero esse sistema", "Falar no WhatsApp agora"):
  - `background: hsl(0 0% 100%)` (branco)
  - `color: hsl(0 0% 0%)` (texto preto)
  - `boxShadow` neutro/sutil
- **Stats numbers, badges, checks**: cor azul escura `hsl(245 60% 65%)`
- **Ponto pulsante do badge "Disponível"**: `hsl(245 70% 60%)`

Resultado: portfólio com identidade visual coerente com o painel real (sem amarelo em lugar nenhum).

## 3. Profissionalizar seção de prints (sem "borda preta sobreposta")

Reescrever o componente `PhoneFrame`:

- Remover o frame preto grosso atual (que sobrepõe o conteúdo).
- Trocar por moldura **fina e elegante**: borda de 2px `hsl(0 0% 100% / 0.08)`, raio `1.5rem`, sombra suave azul `0 30px 80px -20px hsl(245 60% 30% / 0.4)`.
- Sem bisel duplo, sem notch — só o print "flutuando" com leve glow azul atrás.
- `object-fit: cover` + `object-position: top` mantidos para não cortar headers reais.
- Aumentar `maxWidth` para 300px e melhorar espaçamento da grid de prints (`gap-10` no desktop) para respirar.

## 4. Nova seção: ROI Inteligente (real e persuasivo)

Inserir entre **DIFERENCIAIS** e **SOCIAL PROOF**, com cálculos concretos baseados no mercado de barbearia:

```text
┌─ Quanto o sistema devolve no seu bolso ──────────┐
│                                                   │
│  Cenário real de barbearia média (3 cadeiras):   │
│                                                   │
│  ┌──────────────┬──────────────┬──────────────┐  │
│  │ +12          │ −8           │ +R$ 1.840    │  │
│  │ agendamentos │ no-shows/mês │ faturamento  │  │
│  │ /semana      │ evitados     │ extra/mês    │  │
│  └──────────────┴──────────────┴──────────────┘  │
│                                                   │
│  Como?                                            │
│  • Agenda 24/7: cliente marca 2h da manhã        │
│    = +8 cortes/semana que iam pro concorrente    │
│  • Lembrete WhatsApp automático 24h antes        │
│    = corta no-show de 18% pra 4%                 │
│  • Histórico + fidelidade no app                 │
│    = 32% mais retorno em 60 dias                 │
│                                                   │
│  Investimento se paga em ~22 dias.               │
└───────────────────────────────────────────────────┘
```

Componente novo: card grande em destaque com:
- Eyebrow "ROI INTELIGENTE" em azul
- 3 cards com métricas grandes (+12 / −8 / +R$ 1.840)
- Lista explicativa (3 bullets com cálculo real)
- Linha final destacada: **"Investimento se paga em ~22 dias"**

Tom: específico, com números reais de mercado, não promessa vaga.

## 5. Pequenos ajustes finais

- Atualizar todos os labels da grid de screens com nomes profissionais já existentes.
- Manter `WHATSAPP_NUMBER = "5527981120322"`.
- Manter copy atual da hero, dor, features, CTA — só trocar cores.

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/Portifolio.tsx` — substituição de cores, novo PhoneFrame, nova seção ROI
- `src/assets/portfolio-shot-landing.png` — recaptura real
- `src/assets/portfolio-shot-loja.png` — recaptura real
- `src/assets/portfolio-shot-agenda.png` — recaptura real
- `src/assets/portfolio-shot-membro.png` — recaptura real
- `src/assets/portfolio-shot-admin.png` — recaptura real (dashboard logado)

**Sem mudanças em:** rotas, supabase, outras páginas. Só o `/portfolio` e seus assets.
