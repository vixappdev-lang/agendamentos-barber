

# Plano: Modo Claro Profissional + Alinhamento da Personalização

## Resumo
Implementar sistema de tema claro (light mode) configuravel pelo admin, com controle granular por area (Site, Admin, Area do Cliente), e corrigir alinhamento da aba Personalizacao no desktop.

---

## Fase 1 — CSS Variables do Light Theme
**Arquivo: `src/index.css`**

Adicionar bloco `.light-theme` com todas as CSS variables invertidas para modo claro profissional:

- Background: cinza quase branco (`0 0% 97%`)
- Cards: branco puro com sombra sutil
- Texto: cinza escuro elegante
- Borders: cinza suave
- Glass effects: sombras leves em vez de backdrop-filter pesado
- Overrides para `.glass-card`, `.glass-input`, `.btn-primary`, `.btn-secondary`, `.gold-text`, `.glass-chip`
- Override para `body` (remover gradientes escuros no light mode)

Paleta cuidadosa — nada exagerado, nada "branco hospitalar". Cinzas suaves, sombras leves, texto escuro elegante.

---

## Fase 2 — ThemeContext + Hook
**Novo arquivo: `src/contexts/ThemeContext.tsx`**

- Provider que le `theme_mode` e `theme_areas` de `business_settings`
- Aplica classe `.light-theme` no `<html>` baseado na rota atual:
  - `/admin/*` → checa se "admin" esta nas areas
  - `/membro`, `/login` → checa se "member" esta nas areas  
  - `/`, `/loja`, `/agenda` → checa se "site" esta nas areas
- Hook `useIsLightMode(area)` retorna boolean
- Troca instantanea sem reload

**Arquivo: `src/App.tsx`** — Envolver com `<ThemeProvider>`

---

## Fase 3 — Secao "Tema" na Personalizacao do Admin
**Arquivo: `src/pages/admin/Settings.tsx`**

Na aba "Personalizacao", adicionar no topo um card "Tema / Aparencia":
- Toggle master: "Ativar Modo Claro"
- 3 checkboxes (so aparecem quando ativo): Site, Painel Admin, Area do Cliente
- Salva em `business_settings` como `theme_mode` ("dark"/"light") e `theme_areas` (JSON array)

Tambem corrigir o alinhamento geral da aba — garantir grid `lg:grid-cols-2` com cards preenchendo ambas colunas sem espaco morto.

---

## Fase 4 — Adaptar cores hardcoded do Admin
**Arquivos: `AdminLayout.tsx`, `Settings.tsx`, `Finance.tsx`, `Dashboard.tsx`, `AdminLogin.tsx`**

Cada componente admin usa inline styles com HSL hardcoded (ex: `hsl(230 20% 5%)`, `hsl(230 18% 8%)`). Estrategia:

- Criar helper `useAdminTheme()` que retorna objeto de cores baseado no tema
- Substituir ~20 inline styles no AdminLayout (sidebar bg, header bg, borders)
- Substituir backgrounds de cards em Settings, Finance, Dashboard
- AdminLogin: fundo e card de login

Usar CSS variables onde possivel, inline styles com ternario onde necessario.

---

## Fase 5 — Adaptar Site Publico
**Arquivos: `VilaNova.tsx`, `StorePage.tsx`, `Header.tsx`, `Footer.tsx`, `Index.tsx`, `BookingFlow.tsx`, `ServiceCard.tsx`**

O site principal (VilaNova) tem ~30+ inline styles com cores hardcoded. Adaptar:

- Navbar: fundo, borders, links
- Hero: overlay gradient (mais sutil no light)
- About: cards, texto, borders
- Services: cards, preco, botoes
- Gallery: overlay
- CTA: fundo
- Footer: fundo, texto, links
- StorePage: header, cards, search bar
- Booking modal: fundo, steps, cards

---

## Fase 6 — Adaptar Area do Cliente
**Arquivos: `MemberArea.tsx`, `MemberLogin.tsx`**

- MemberArea: fundo, header, tabs, cards de agendamento, status badges, booking modal, aba PIX
- MemberLogin: fundo, card de login, slider

---

## Fase 7 — Testes e Ajustes
- Verificar cada pagina em ambos os temas
- Garantir que o toggle funciona instantaneamente
- Verificar que mobile continua perfeito
- Verificar que o tema default (dark) nao foi alterado

---

## Regras de Seguranca

- O tema escuro atual permanece INTOCADO como padrao
- A classe `.light-theme` so e adicionada quando o admin ativa
- Nenhum componente visual existente e recriado
- Nenhuma funcionalidade e alterada
- Responsividade preservada
- Se o admin nao configurar nada, tudo continua escuro como esta

---

## Estimativa de Arquivos Alterados

| Arquivo | Tipo de Mudanca |
|---------|----------------|
| `src/index.css` | Adicionar bloco `.light-theme` |
| `src/contexts/ThemeContext.tsx` | **Novo** — Provider + hook |
| `src/App.tsx` | Envolver com ThemeProvider |
| `src/pages/admin/Settings.tsx` | Secao tema + alinhamento |
| `src/components/admin/AdminLayout.tsx` | Cores adaptativas |
| `src/pages/admin/Dashboard.tsx` | Cores adaptativas |
| `src/pages/admin/Finance.tsx` | Cores adaptativas |
| `src/pages/AdminLogin.tsx` | Cores adaptativas |
| `src/pages/VilaNova.tsx` | Cores adaptativas |
| `src/pages/StorePage.tsx` | Cores adaptativas |
| `src/pages/MemberArea.tsx` | Cores adaptativas |
| `src/pages/MemberLogin.tsx` | Cores adaptativas |

