
## Problema

O footer nunca aparece no preview do editor porque:

1. `DEFAULT_SECTIONS` em `EditorSidebar.tsx` não inclui `"footer"` (é tratado como elemento fixo global, junto com o header)
2. `LivePreview.tsx` passa `visibleSections={sections.filter(s => s.visible !== false).map(s => s.key)}` — array que **nunca contém** `"footer"`
3. Em `buildBlockMap` (`PublicSiteRenderer.tsx`), `showBlock("footer")` retorna `false` porque `visibleSections` não inclui `"footer"` → footer é `null`
4. Os templates iteram `orderedKeys` (que é `visibleSections` no editor) e o footer nunca está lá

O header não sofre o mesmo problema porque é renderizado fora do `blockMap` via `<SharedNav>`, que é chamado diretamente no JSX de cada template antes do `orderedKeys.map(...)`.

## Solução

O footer, assim como o header/nav, é um elemento **sempre presente**. A correção mais limpa é renderizá-lo **fora** do `blockMap` nos templates, diretamente no JSX, igualando ao comportamento do `SharedNav`.

### Mudança em `PublicSiteRenderer.tsx`

Nos 4 templates (Editorial, Grid, Magazine, Clean), mover o `SharedFooter` para fora do `orderedKeys.map(...)` e renderizá-lo diretamente após o mapeamento, mantendo o `data-block-key="footer"` para o click do editor funcionar:

```tsx
// Em cada template:
return (
  <div className="min-h-screen bg-background">
    <SharedNav ... />
    {orderedKeys.map((key) => (blocks as any)[key] ?? null)}
    {/* Footer sempre renderizado — é global como o header */}
    <SharedFooter site={site} showContact={showContact} />
  </div>
);
```

E remover `footer` do `buildBlockMap` (não precisa mais estar no blockMap) e dos `*_DEFAULT_ORDER` arrays.

**Arquivo a editar:** apenas `src/components/store/PublicSiteRenderer.tsx`
- Remover `footer` do `buildBlockMap` return (linha 1138)
- Remover `"footer"` dos 4 arrays `*_DEFAULT_ORDER`
- Nos 4 templates, adicionar `<SharedFooter ... />` após o `orderedKeys.map()`
- Passar `showContact` ao `SharedFooter` via `derived`

