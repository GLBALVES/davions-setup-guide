
## Análise do código-fonte do Pixieset — O que aprender e implementar

### O que o código revela sobre a arquitetura do Pixieset

**1. Sistema de blocos com `data-blockkey` em cada container**
Cada bloco tem: `data-blockid`, `data-blockUuid`, `data-blockkey` (ex: `"single_text_block"`, `"single_photo_with_text_horizontal_block"`, `"divider_block"`, `"feature_links_multiple_photos_block"`)
→ **Nosso editor já implementou isso com `data-block-key`** — estamos no caminho certo.

**2. Toolbar inline flutuante por bloco (block-container__menu)**
Cada `block-container` tem um `block-container__menu` escondido que aparece no hover com:
- **Layout A/B/C** — shortcut para trocar variação de layout do bloco
- **Edit** (ícone engrenagem) — abre painel lateral
- **Duplicate** (ícone clone)
- **Delete** (ícone trash)
- **Move** (drag handle vertical `fa-arrows-v`)

Isso aparece diretamente no canvas, sobreposto ao bloco.

**3. Botão "+" entre blocos (block-container__add-block-link)**
Cada bloco tem dois links: `--top` e `--bottom`, que mostram `<i class="far fa-plus">` centralizado com uma linha horizontal. Clica e abre `#add-block-modal`.

**4. Sistema de CSS variables por bloco para cores**
Cada bloco tem `style="--primary-background:#FFFFFF; --primary-headings:#826645; ..."` — esquema de cores individual por bloco (não apenas cor de accent global).

**5. Color shuffler por bloco**
`<div class="block-color-scheme__menu"><div class="color-shuffler__menu"></div></div>` — cada bloco pode ter seu próprio esquema de cores (light/accent/dark).

---

### O que implementar agora (baseado no código real)

**A. Toolbar inline no canvas** ← diferencial principal
Quando o usuário hover sobre uma seção no preview, mostrar uma toolbar flutuante no topo do bloco com:
- Label do bloco (ex: "Hero")
- Botão Edit (abre painel esquerdo)
- Botão de visibilidade toggle (show/hide)
- Drag handle (apenas visual por ora)

Implementação: em `LivePreview.tsx`, além do overlay transparente, renderizar condicionalmente um `div` posicionado absolute no topo do `hoveredBlock`, com os botões de ação. Coordenadas calculadas via `getBoundingClientRect()` do elemento com `data-block-key`.

**B. Botão "+" entre seções no canvas**
Pixieset coloca o `+` no topo E na base de cada bloco. Ao clicar, poderia scrollar o painel esquerdo para a seção correspondente ou mostrar seções ocultas.

Implementação mais simples: ao hover sobre a borda inferior de um bloco, mostrar um botão `+` centralizado que, ao clicar, alterna a visibilidade da próxima seção oculta ou abre a lista de seções no painel.

**C. Variação de layout por bloco (Layout A/B/C)**
Pixieset tem múltiplas variações de layout para o mesmo tipo de bloco (text-only, photo+text lado esquerdo, photo+text lado direito, etc.). Nosso sistema atualmente tem apenas um layout fixo por seção.

Implementação: adicionar campo `hero_layout` (values: "full", "split-left", "split-right"), `about_layout` ("text-only", "image-left", "image-right") no `SiteConfig` e no `BlockPanel`. Renderizar variações diferentes no `PublicSiteRenderer` baseado nesses campos.

---

### Plano de implementação

**Arquivo: `LivePreview.tsx`**
- Calcular a posição do bloco hovado via `getBoundingClientRect`
- Renderizar toolbar flutuante posicionada no topo do bloco hovado
- Toolbar contém: label, botão edit (→ onSelectBlock), botão eye (→ onToggleVisibility), drag handle visual

**Arquivo: `BlockPanel.tsx`**
- Adicionar seletor de variação de layout para Hero ("Imagem cheia", "Texto + Imagem") e About ("Texto + Imagem Lado Direito", "Texto + Imagem Lado Esquerdo")
- Usar um seletor visual com thumbnails ou botões

**Arquivo: `PublicSiteRenderer.tsx`**
- Suporte à variação de layout no Hero (full-bleed vs split)
- Suporte à variação de layout no About (imagem à esquerda vs direita)

**Arquivo: `EditorSidebar.tsx`** (mudança menor)
- No hover de cada item da lista de seções, mostrar os mesmos botões (eye + settings) que já existem mas de forma mais visível

### Props adicionais necessárias em LivePreview

```tsx
interface Props {
  // existentes...
  onToggleVisibility: (key: BlockKey) => void;  // ← novo
  sections: SectionDef[];                        // ← novo (para saber quais estão visíveis)
}
```

### Mudanças no SiteConfig / banco

Adicionar campos opcionais (sem migração obrigatória, default para layout existente):
- `hero_layout?: "full" | "split"` — default "full"
- `about_layout?: "image-left" | "image-right"` — default "image-right"

Adicionar esses campos no tipo `SiteConfig` e na lógica do `PublicSiteRenderer`.

### Arquivos a editar

1. `src/components/website-editor/LivePreview.tsx` — toolbar inline flutuante
2. `src/components/website-editor/BlockPanel.tsx` — seletor de layout por bloco
3. `src/components/store/PublicSiteRenderer.tsx` — variações de layout (hero split, about image-left/right)
4. `src/pages/dashboard/WebsiteEditor.tsx` — passar `onToggleVisibility` e `sections` para LivePreview

### Sem migração de banco necessária
Os novos campos de layout são adicionados ao tipo TypeScript como opcionais; o `upsert` existente já cuida do salvamento.
