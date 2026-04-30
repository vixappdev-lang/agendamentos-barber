
# Plano: Rebrand Styllus + Galeria do Insta + Nova rota /agenda-direto

## 1. Scraping ao vivo do Instagram @barbeariastylluscoqueiral

Usar **Firecrawl** (já recomendado nas instruções) via edge function temporária ou direto no shell para extrair:

- **Logo** (foto de perfil em alta)
- **Nome real / bio / endereço / telefone / WhatsApp**
- **Melhores fotos de cortes** (pegar ~12 posts, filtrar manualmente os melhores 6-8 cortes reais — sem flyers/promo)

Fluxo:
1. `firecrawl scrape` da página do perfil → extrai metadados + lista de posts
2. Para cada post relevante, baixar a imagem em alta (`scontent...cdninstagram.com`)
3. Salvar em `src/assets/styllus/`:
   - `logo.png` (avatar quadrado, redimensionado p/ caber no header sem distorcer)
   - `hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg` (3 melhores p/ slider topo)
   - `gallery-1..6.jpg` (galeria/seção de cortes)

Se Firecrawl falhar com algum post (Insta bloqueia bastante), faço fallback via `code--fetch_website` na URL pública do post + extração do `og:image`.

## 2. Atualizar o site Genesis (Styllus)

Editar **`src/pages/VilaNova.tsx`** (é o site principal usado pelo perfil Genesis):

- Trocar imports `vilanova-hero-*` e `vilanova-gallery-*` pelos novos `styllus/*`
- Trocar `vilanova-logo.png` no header pela nova `styllus/logo.png`
  - Tamanho do logo: manter altura atual do header (≈40-48px), `object-contain`, sem esticar — adapto o aspect ratio real do avatar
- Slider do topo: já roda em loop sobre `heroImages[]` — só troco a fonte das imagens
- Slider/galeria de cortes: idem, troco `galleryImages[]`
- Endereço, telefone, WhatsApp, Instagram: atualizar nas seções de contato/footer com os dados extraídos do Insta. Se algum campo não vier do Insta (endereço completo costuma vir só "Coqueiral, Aracaju"), uso o que estiver disponível e mantenho campos vazios em vez de inventar.

**Nada de design muda** — só conteúdo (imagens, textos de contato, logo).

## 3. Nova rota `/agenda-direto`

Criar **`src/pages/AgendaDireto.tsx`** e registrar em `src/App.tsx` dentro do `HostnameResolver mode="wrapper"` (mesmo grupo de `/agenda`).

Diferenças vs `/agenda` (que é flow step-by-step embutido no VilaNova):

- **Layout direto, sem hero/landing** — vai direto pra escolha
- **Listagem por categorias** (mock local, sem integrar admin):
  - Cabelo (Corte clássico, Corte degradê, Corte tesoura, Platinado…)
  - Barba (Barba completa, Acabamento, Barboterapia…)
  - Combos (Cabelo + Barba, Pacote completo…)
  - Tratamentos (Hidratação, Pigmentação, Sobrancelha…)
- Tabs/chips horizontais de categoria + grid de cards de serviço (`ServiceCard` reusado)
- Fluxo após selecionar serviço: **Profissional → Data/Hora → Dados → Confirmar** (mesmo modelo do existente, mas em página dedicada, mais "app-like")
- Profissionais também mockados localmente (3-4 barbeiros fictícios com avatar)
- Botão final mostra apenas um toast `"Agendamento simulado — preview"` (sem inserir no banco, conforme pedido "só pra mim ver")

Componentes reutilizados: `ServiceCard`, design tokens `useThemeColors`, `framer-motion`, mesmos botões/inputs do shadcn.

## 4. Arquivos

**Criar:**
- `src/assets/styllus/logo.png`
- `src/assets/styllus/hero-1.jpg`, `hero-2.jpg`, `hero-3.jpg`
- `src/assets/styllus/gallery-1.jpg` … `gallery-6.jpg`
- `src/pages/AgendaDireto.tsx`
- `src/data/agendaDiretoMock.ts` (categorias + serviços + barbeiros mock)

**Editar:**
- `src/pages/VilaNova.tsx` — imports de imagens, logo no header, dados de contato/endereço/telefone/instagram
- `src/App.tsx` — registrar rota `/agenda-direto`

## 5. Riscos e mitigação

- **Instagram pode bloquear scraping** → Firecrawl normalmente passa; fallback é pegar `og:image` de cada `/p/<shortcode>/` via fetch_website. Se nem isso funcionar, aviso e uso só o que conseguir + completo com placeholders neutros (sem inventar pessoas).
- **Logo com fundo** (avatar Insta às vezes vem com bg) → se necessário, recorto/ajusto pra ficar limpo no header escuro.
- **Endereço incompleto na bio** → uso o que tiver + Instagram/WhatsApp como contato principal.

Aprova pra eu executar?
