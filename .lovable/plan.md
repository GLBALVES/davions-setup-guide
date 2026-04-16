

# Plano: Tornar o Editor de Website Funcional

## Problema atual

O editor tem toda a infraestrutura de sidebar (páginas, blocos, reordenar, configurar), mas o **preview não renderiza os blocos**. O `PublicSiteRenderer` ainda usa o sistema legado de templates (editorial, grid, etc.) com seções hardcoded vindas de `photographer_site`. Os dados de `site_pages.page_content.sections` são ignorados.

## Arquitetura proposta

```text
┌─ Editor Sidebar ─┐     ┌─ Preview (iframe) ─────────────────┐
│  Pages list       │     │                                     │
│  Block list       │────▶│  PublicSiteRenderer                 │
│  Block settings   │     │    ├─ SharedNav                     │
│  Add/remove/move  │     │    ├─ SectionRenderer (NEW)         │
│                   │     │    │   ├─ HeroBlock                 │
│                   │     │    │   ├─ TextBlock                 │
│                   │     │    │   ├─ GalleryGridBlock          │
│                   │     │    │   ├─ ContactFormBlock          │
│                   │     │    │   └─ ... (all 25 types)        │
│                   │     │    └─ SharedFooter                  │
└───────────────────┘     └─────────────────────────────────────┘
```

## Etapas

### 1. Criar `SectionRenderer` — componente que renderiza blocos do editor
Novo arquivo `src/components/store/SectionRenderer.tsx` com um componente para cada `SectionType`:
- **Hero**: imagem de fundo, headline, subtitle, CTA
- **Text**: corpo de texto com markdown básico
- **Image+Text / Text+Image**: layout 2 colunas com imagem e texto
- **Gallery Grid / Masonry**: grid de imagens (placeholder quando vazio)
- **Contact Form**: formulário funcional (nome, email, mensagem)
- **CTA**: bloco de call-to-action
- **FAQ Accordion**: perguntas com accordion nativo
- **Pricing Table**: cards de planos
- **Timeline**: eventos em linha vertical
- **Testimonials**: quotes de clientes
- **Stats**: números lado a lado
- **Team**: membros com foto
- **Video**: embed de vídeo (YouTube/Vimeo)
- **Carousel / Slideshow**: slider de imagens
- **Instagram Feed**: grid de fotos do IG
- **Columns 2/3**: layouts multi-coluna
- **Map**: embed Google Maps
- **Social Links / Logo Strip / Embed / Spacer / Divider**: utilitários

Cada bloco lê de `section.props` e aplica `blockSettings` (bg, padding, animation).

### 2. Integrar no `PublicSiteRenderer`
- Quando `visibleSections` é um array de section types (vindo do `site_pages`), em vez de renderizar o template legado, renderizar cada seção via `SectionRenderer`
- Manter SharedNav + SharedFooter wrapping
- O `StorePage.tsx` já passa `homeSections` — agora precisamos também passar os dados completos das sections (não só os types)

### 3. Ajustar `StorePage.tsx` para passar sections completas
- Em vez de passar apenas `sections_order` (array de strings), passar o array completo de `PageSection[]` do `page_content.sections`
- Novo prop no `PublicSiteRenderer`: `pageSections?: PageSection[]`
- Quando `pageSections` existe, renderizar via `SectionRenderer`; senão, fallback para template legado

### 4. Auto-refresh do preview
- Adicionar `key` no iframe baseado em hash dos sections para forçar reload quando blocos mudam
- Alternativa: usar `postMessage` para comunicação editor→preview (mais fluido)

### 5. Sub-páginas também renderizam blocos
- O bloco de sub-página no `PublicSiteRenderer` (linha 1866) atualmente mostra só texto estático
- Mudar para renderizar as `sections` da página via `SectionRenderer`

## Escopo do SectionRenderer (prioridade)

Fase 1 (essencial — esta implementação):
- Hero, Text, Image+Text, Text+Image, CTA, Gallery Grid, Gallery Masonry, Contact Form, Spacer, Divider, Video, FAQ, Stats, Testimonials

Fase 2 (próxima iteração):
- Pricing Table, Timeline, Team, Carousel, Slideshow, Instagram Feed, Map, Social Links, Logo Strip, Embed, Columns 2/3

## Arquivos modificados
- **Novo**: `src/components/store/SectionRenderer.tsx`
- **Editado**: `src/components/store/PublicSiteRenderer.tsx` — integrar SectionRenderer
- **Editado**: `src/pages/store/StorePage.tsx` — passar sections completas
- **Editado**: `src/pages/store/SiteSubPage.tsx` — renderizar blocos em sub-páginas

## Resultado esperado
- Criar uma página com template "About 1" → preview mostra Hero + Image/Text + Stats + Testimonials + CTA renderizados de verdade
- Reordenar blocos na sidebar → preview reflete a nova ordem
- Adicionar/remover blocos → preview atualiza

