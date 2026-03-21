
## Botão "+" entre seções — Modal "Add Block" estilo Pixieset

### O que o usuário quer
Ao passar o mouse entre duas seções no preview do editor, aparecer um botão "+" que ao ser clicado abre um modal com um catálogo de blocos/layouts disponíveis para adicionar àquela posição — exatamente como no Pixieset (imagem de referência).

### Abordagem

O sistema atual usa seções fixas com toggle de visibilidade. A lógica do "+" será: **mostrar uma seção oculta** ou **reposicionar** uma seção oculta para a posição entre dois blocos existentes. O modal exibe thumbnails visuais agrupados por categoria (Banner, Info Block, Quote, About, etc.), e ao clicar num bloco, ele é inserido/ativado naquela posição.

#### Fluxo
1. No `LivePreview`, ao hover sobre a borda inferior de um bloco, aparece uma linha com botão `+` centralizado
2. Clicar no `+` abre `AddBlockModal` — modal tela cheia com painel de categorias à esquerda e grid de thumbnails à direita
3. Ao selecionar um template de bloco: se a seção já existe mas está oculta → torná-la visível e movê-la para essa posição; se já está visível → abrir o `BlockPanel` para edição

### Componentes

**1. `src/components/website-editor/AddBlockModal.tsx`** (novo)
- Dialog fullscreen ou max-w-4xl
- Sidebar esquerda com categorias: Hero, Sessions, Portfolio, About, Quote, Experience, Contact, Footer
- Grid de "cards preview" para cada categoria com mockup visual SVG/div
- Cada card mostra um mini thumbnail descritivo + label
- Ao clicar: chama `onAdd(blockKey, insertAfterIndex)`

**2. `src/components/website-editor/LivePreview.tsx`** (editar)
- Novo estado: `hoveredGap: number | null` — índice da "gap" entre seções (0 = antes do primeiro, n = após o nth)
- Calcular posições de todas as seções visíveis para detectar quando o mouse está perto do limite inferior de um bloco
- Renderizar linha `+` posicionada entre os blocos ao hover
- Botão `+` é `pointer-events-auto` e chama `onAddBlock(insertAfterIndex)`

**3. `src/pages/dashboard/WebsiteEditor.tsx`** (editar)
- Novo estado `addBlockState: { open: boolean; insertAfter: number } | null`
- Handler `handleAddBlock(blockKey, insertAfter)`: 
  - Se seção está oculta: `setSections` para torná-la visível e reordenar
  - Se já visível: apenas ativar o `BlockPanel` correspondente
  - Chama `save()`

**4. `src/components/website-editor/LivePreview.tsx` — Props adicionais**
```tsx
onAddBlock: (insertAfterIndex: number) => void;
```

### Categorias e thumbnails do modal

| Categoria | Blocos disponíveis | Mockup visual |
|---|---|---|
| Banner/Hero | Hero Full Bleed, Hero Split | Div com bg escuro + texto centrado |
| Content | About (image-right), About (image-left), About (text-only), Experience | Layout 50/50 ou texto |
| Quote | Quote | Aspas grandes + texto |
| Links | Sessions, Portfolio | Grid de cards |
| Contact | Contact, Footer | Ícones sociais + texto |

Os thumbnails são **mini representações CSS puras** (não imagens reais) — retângulos coloridos dispostos para imitar o layout visual.

### Lógica de inserção

```ts
// Se o bloco NÃO existe nas sections (foi removido) → não aplicável no sistema atual
// Se o bloco existe mas está OCULTO → torná-lo visível e mover para posição insertAfter
// Se o bloco já está VISÍVEL → focar no BlockPanel (não duplicar)
function handleAddBlock(blockKey: BlockKey, insertAfterIndex: number) {
  const idx = sections.findIndex(s => s.key === blockKey);
  const newSections = sections.map(s => s.key === blockKey ? { ...s, visible: true } : s);
  // Reordenar: mover blockKey para posição insertAfterIndex
  const [removed] = newSections.splice(idx, 1);
  newSections.splice(insertAfterIndex, 0, removed);
  setSections(newSections);
  save(siteData, newSections);
  setActiveBlock(blockKey);
}
```

### Detecção de gap no hover (LivePreview)

Usar `getBoundingClientRect` das seções visíveis ordenadas. Quando `mouseY` está dentro de ±20px da borda inferior de um bloco → `hoveredGap = index`. A linha "+" aparece centrada nessa borda.

### Arquivos a criar/editar

- **Criar**: `src/components/website-editor/AddBlockModal.tsx`
- **Editar**: `src/components/website-editor/LivePreview.tsx` — detecção de gap + botão "+"
- **Editar**: `src/pages/dashboard/WebsiteEditor.tsx` — estado e handler de addBlock
