

## Adicionar 5 novos templates de site inspirados no Pixieset

### Contexto
Atualmente existem 4 templates: Editorial, Grid, Magazine e Clean. Serão adicionados 5 novos inspirados no Pixieset: **Sierra**, **Canvas**, **Avery**, **Seville** e **Milo**.

### Estilo visual de cada template (baseado nos demos do Pixieset)

- **Sierra**: Hero full-screen com tipografia serif grande centralizada, nav na parte inferior do hero, slide counter lateral (01/02/03), tom escuro editorial
- **Canvas**: Hero full-bleed com tipografia serif elegante centralizada, nav centrada com nome no meio, setas laterais para slides, feel poético e íntimo
- **Avery**: Sidebar fixa à esquerda com nav vertical, conteúdo principal é um masonry/grid de fotos sem hero, foco total no portfólio, tom clean
- **Seville**: Nav horizontal no topo com nome à esquerda, hero em container (não full-bleed) com overlay suave, tipografia cursiva/elegante, tom arejado e luxuoso
- **Milo**: Nav centrada com nome no meio e CTA "Book a Session", hero texto grande sem imagem de fundo, abaixo um carousel assimétrico de fotos (grande central + menores laterais), tom quente e acolhedor

### Arquivos a alterar

#### 1. `src/components/store/PublicSiteRenderer.tsx`
- Expandir o tipo do `variant` de `"editorial" | "grid" | "magazine" | "clean"` para incluir `"sierra" | "canvas" | "avery" | "seville" | "milo"`
- Em `buildBlockMap`: adicionar blocos hero, sessions, portfolio e about específicos para cada novo variant
- Criar 5 novas funções de template: `SierraTemplate`, `CanvasTemplate`, `AveryTemplate`, `SevilleTemplate`, `MiloTemplate` (seguindo o padrão existente com `buildBlockMap` + `orderedKeys` + SharedNav/SharedFooter)
- Atualizar o switch no `PublicSiteRenderer` para rotear os 5 novos nomes

#### 2. `src/components/dashboard/TemplatePreviewCard.tsx`
- Adicionar entradas em `TEMPLATE_CONFIG` para cada template (foto de fundo, cores de overlay)
- Criar 5 novos componentes de overlay wireframe: `SierraOverlay`, `CanvasOverlay`, `AveryOverlay`, `SevilleOverlay`, `MiloOverlay`
- Registrar em `OVERLAYS`

#### 3. `src/pages/dashboard/WebsiteSettings.tsx`
- Adicionar os 5 novos templates ao array `TEMPLATES` com label e description

### Detalhes de implementação dos layouts

**Sierra** — Hero fullscreen com tipografia display serif grande, subtítulo tracking largo, sem CTA visível no hero. Sessions em cards alternados (esquerda/direita) tipo editorial.

**Canvas** — Hero fullscreen com serif italic elegante, centered. Sessions em grid 2 colunas com hover sutil. Sensação poética.

**Avery** — Layout diferenciado: sidebar fixa 220px com nav vertical à esquerda, conteúdo scrollable à direita. Hero é apenas o masonry grid. Sessions como cards empilhados na área principal.

**Seville** — Hero em container com bordas (não edge-to-edge), nav clean no topo. Sessions em cards com bordas suaves e tipografia light. About com layout lado a lado.

**Milo** — Hero sem imagem: tipografia display grande centralizada sobre fundo claro/quente. Abaixo, seção com 3 fotos em tamanhos assimétricos (grande central). Sessions em cards arredondados com tom acolhedor.

### Escopo
- Apenas renderização visual (CSS/layout). Reutiliza os mesmos dados e blocos (hero, sessions, about, portfolio, testimonials, etc.)
- Sem alterações de banco de dados (o campo `site_template` já aceita qualquer string)
- Sem novas dependências

