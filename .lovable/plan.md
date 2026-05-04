## Mudanças

### 1. Atualizar print da loja
Já recapturei o print real de `https://lynecloud.online/loja` (mostra "Pomada Gel" + "Pomada Styllus" com fotos reais dos produtos) e substituí em `src/assets/portfolio-shot-loja.png`. Esse arquivo permanece como fallback caso o iframe falhe, mas a seção principal vira live preview.

### 2. Telas reais ao vivo (substitui os prints estáticos)
Trocar a grid de prints por **iframes ao vivo** — o usuário toca, rola e interage de verdade:

| Ordem | Label | URL embedada |
|---|---|---|
| 1 | Site da barbearia | `https://lynecloud.online/` |
| 2 | Agendamento | `https://lynecloud.online/agenda-direto` |
| 3 | Painel admin | `https://lynecloud.online/admin/login` ← ao lado do agendamento |
| 4 | Loja online | `https://lynecloud.online/loja` |
| 5 | Área do cliente | `https://lynecloud.online/membro` |

Verifiquei: `lynecloud.online` não envia `X-Frame-Options` nem `frame-ancestors` — todos os iframes carregam normalmente. Cada iframe usa `sandbox="allow-scripts allow-same-origin allow-forms allow-popups"` e fica dentro de uma moldura fina de celular (sem bisel grosso, sem notch, sem neon).

A hero do topo também usa um LivePhone do `/`, mas com `pointer-events: none` pra não roubar o scroll.

Cada card tem um link discreto "abrir em tela cheia" abaixo do label.

### 3. Remover o fundo azul forte e neon
- Apagar os 3 grandes radial gradients azuis fixos no fundo (estavam muito intensos).
- Trocar por um fundo escuro neutro (`hsl(230 18% 5%)`) com vinheta sutil + textura de grão quase imperceptível.
- Remover **todos** os glows/halos:
  - Halo azul atrás dos celulares — REMOVIDO.
  - `boxShadow` colorido azul nos botões CTA — REMOVIDO (botões brancos com texto preto puro, sem brilho).
  - Glow azul no card "Por que comigo" — REMOVIDO.
  - Sombras de blur neon azul — REMOVIDAS.
- Acentos azuis ficam apenas em: textos eyebrow, ícones, números do ROI, bullet points. Tudo num azul mais sóbrio (`hsl(245 55% 62%)` em vez de 60% saturado).

### 4. Profissionalizar a seção das telas
- Grid responsiva: 1 col mobile / 2 col sm / 3 col md-lg / 5 col xl (desktop largo). Em telas médias os 5 não cabem espremidos — quebra pra 3+2 limpo.
- `gap-6 sm:gap-8` pra respirar.
- Label em pílula uppercase + link "abrir em tela cheia" abaixo.
- Subtítulo da seção: "**Toque, role, explore. Não são imagens.**" + caption explicando que são iframes da barbearia em produção.

### 5. Limpar resto
- Remover `useScroll`/parallax do hero (mais leve, sem efeito exagerado).
- Remover `backdrop-blur-xl` de todos os cards (não tem mais glass por trás, ficava sujo).
- Manter ROI, Diferenciais, Social Proof, CTA — só com acentos azuis sóbrios e sem glows.

## Arquivos editados
- `src/pages/Portifolio.tsx` — reescrito (LivePhone com iframe, fundo neutro, sem neon)
- `src/assets/portfolio-shot-loja.png` — recapturado com o print real atualizado da loja (fallback caso iframe não carregue)
- Os outros assets `portfolio-shot-*.png` ficam no projeto mas não são mais importados/usados na página.
