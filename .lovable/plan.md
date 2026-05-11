
## Objetivo

Reproduzir os efeitos de movimento que o Wix oferece, observados nos vídeos enviados:
- Imagens grandes com **parallax** (fundo se move mais devagar que o texto durante o scroll).
- Cards/textos que **revelam, deslizam e dão zoom** conforme entram na tela.
- Efeito contínuo amarrado ao scroll (scrub), não só uma animação de entrada de uma vez.

Hoje o projeto já tem `useSiteAnimations` com 5 estilos one-shot globais (None / Fade In / Slide Up / Scale Up / Scale Down / Reveal). Vamos **expandir esse sistema** para suportar efeitos contínuos de scroll, mantendo compatibilidade com o que já está salvo.

## Camadas do recurso

### 1) Camada global — "Scroll Motion" (todas as seções)
Renomear o painel atual `Animations` para **Scroll Motion** e ampliar a lista de presets, agora cobrindo entrada + efeito contínuo:

- None
- Fade In *(existente)*
- Slide Up *(existente)*
- Scale Up *(existente)*
- Scale Down *(existente)*
- Reveal *(existente)*
- **Fly In Left / Fly In Right** (nova — entra deslizando lateralmente)
- **Pop / Zoom In** (nova — escala 0.85 → 1.0)
- **Parallax (Soft)** (nova — translate Y contínuo amarrado ao scroll, em todas as seções; intensidade ~12%)

Compatível com os valores já salvos em `site.animation_style`.

### 2) Camada por bloco — "Scroll Effect" em mídias
Adicionar um campo opcional `scrollEffect` em `BlockSettings` para blocos de imagem/galeria (Hero, Image, Gallery Grid, Masonry, Carousel, Slideshow), com efeitos contínuos amarrados ao scroll (igual aos vídeos):

- None (padrão)
- **Parallax** — imagem se move ~20% mais devagar que o container.
- **Reveal** — máscara `clip-path` abre conforme entra (efeito "cortina"), igual ao mostrado no vídeo 1.
- **Zoom on Scroll** — imagem escala de 1.0 → 1.1 enquanto a seção atravessa o viewport.
- **Fade on Scroll** — opacidade interpolada conforme entra/sai da tela.
- **Fly In** (Left/Right/Up) — translate amarrado ao progresso de entrada.

A UI fica num novo subpainel **Scroll Effect** dentro do `BlockSettingsPanel`, ao lado de Animation/Padding existentes.

### 3) Implementação técnica

Arquivo central novo: `src/components/website-editor/useScrollMotion.ts`

- Um único `IntersectionObserver` decide quais elementos estão "ativos" (no viewport ± margem).
- Para os ativos, um único listener `scroll` (rAF-throttled) calcula o **progresso** (0 → 1) de cada elemento conforme atravessa o viewport e aplica via CSS variables:
  - `--motion-progress: 0..1`
  - `--motion-y: <px>` para parallax
  - `--motion-scale: <n>` para zoom
  - `--motion-opacity: <n>` para fade
  - `--motion-clip: <n%>` para reveal
- O CSS (em `index.css`) traduz essas vars em `transform`/`opacity`/`clip-path` por tipo de efeito (`[data-motion="parallax"]`, etc.). Tudo via `transform`/`opacity` para manter 60fps.
- Respeita `prefers-reduced-motion: reduce` (desativa tudo).
- Sem libs externas (sem GSAP/Framer); puro CSS + rAF.

Markup:
- Seções já têm `data-block-key`. O hook adiciona `data-motion="<effect>"` no nó alvo (`<img>` para parallax/zoom/reveal, no wrapper para fade/fly-in).
- O mesmo hook é chamado tanto no editor (`WebsiteEditor.tsx`) quanto no site público (`PublicSiteRenderer.tsx`), substituindo `useSiteAnimations` (mantém retrocompatibilidade — chama internamente a parte one-shot quando o preset for um dos antigos).

### 4) Persistência

- Global: já existe `site.animation_style` (string). Sem migração necessária; só novos valores possíveis.
- Por bloco: adicionar `scrollEffect?: string` ao tipo `BlockSettings` no front. Salvo dentro do JSON do bloco (mesma coluna que já guarda `padding`, `animation`, etc.). Sem mudança de schema no banco.

### 5) Multi-idioma

Os rótulos do painel passam pelo `LanguageContext` (EN/PT-BR/ES) — mantém o padrão dos demais sub-painéis. Strings novas: "Scroll Motion", "Parallax", "Reveal", "Zoom on Scroll", "Fade on Scroll", "Fly In".

## Arquivos afetados

- **Novo** `src/components/website-editor/useScrollMotion.ts` — hook unificado (parallax + entrance).
- **Novo** `src/components/website-editor/settings/ScrollEffectSubPanel.tsx` — UI por-bloco.
- `src/components/website-editor/settings/AnimationsSubPanel.tsx` — adicionar novos presets.
- `src/components/website-editor/BlockSettingsPanel.tsx` — registrar novo subpainel "Scroll Effect".
- `src/index.css` — keyframes e classes `[data-motion="..."]` (transform/opacity/clip-path).
- `src/pages/dashboard/WebsiteEditor.tsx` e `src/components/store/PublicSiteRenderer.tsx` — trocar `useSiteAnimations` por `useScrollMotion` (compatível).
- `src/components/store/SectionRenderer.tsx` — propagar `scrollEffect` do `BlockSettings` para `data-motion` no nó certo (imagem/wrapper).

## Fora de escopo

- Não vamos adicionar dependência externa (GSAP, Framer Motion, Locomotive).
- Não vamos refatorar a renderização das galerias, só inserir os atributos de motion.
- Sem mudanças em backend / banco.

## Resultado esperado

- O efeito de "imagens com parallax e textos que se revelam suavemente" do vídeo 1 fica disponível por bloco (Parallax + Reveal nas imagens, Fly In nos cards).
- O efeito de "tudo entra suavemente conforme scroll" do vídeo 2 fica disponível como preset global (Fade In / Slide Up / Pop / Parallax Soft).
- Performance estável: um único observer + um único rAF, tudo via CSS transforms.
