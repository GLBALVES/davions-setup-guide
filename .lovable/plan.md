
## Diagnóstico

O `PublicSiteRenderer` renderiza os blocos em **ordem fixa e hardcoded** no JSX de cada template (Editorial, Grid, Magazine, Clean). A prop `visibleSections` só filtra SE um bloco aparece — mas nunca controla a **ordem** em que aparecem.

Quando o usuário reordena via drag-and-drop no sidebar:
1. `handleReorderPageSections` atualiza `pages` → `activePageSections` muda (sidebar correto ✓)
2. `LivePreview` passa `visibleSections={sections.filter(v).map(key)}` ao `PublicSiteRenderer` com as keys na nova ordem ✓
3. `PublicSiteRenderer` ignora a ordem do array e renderiza hero → quote → sessions → experience → portfolio → about → testimonials → footer sempre na mesma sequência ✗

## Solução

Adicionar renderização dinâmica baseada na ordem de `visibleSections` em cada template.

A abordagem mais limpa: criar um mapa de render functions para cada bloco, e quando `visibleSections` for passado (modo editor), renderizar iterando o array em ordem. Quando `visibleSections` for null (site público), renderizar na ordem fixa atual.

### Mudanças

**`src/components/store/PublicSiteRenderer.tsx`** — 4 templates afetados (Editorial, Grid, Magazine, Clean):

Para cada template, extrair os blocos como um `Record<string, ReactNode>` e quando `visibleSections` estiver presente, renderizar mapeando o array:

```tsx
// Dentro de cada template:
const blockMap: Record<string, React.ReactNode> = {
  hero: <div data-block-key="hero">...</div>,
  quote: showBlock("quote") ? <div data-block-key="quote">...</div> : null,
  sessions: showBlock("sessions") && showStore ? <main data-block-key="sessions">...</main> : null,
  experience: showBlock("experience") ? <div data-block-key="experience">...</div> : null,
  portfolio: showBlock("portfolio") ? <section data-block-key="portfolio">...</section> : null,
  about: showBlock("about") ? <div data-block-key="about">...</div> : null,
  testimonials: showBlock("testimonials") ? <div data-block-key="testimonials">...</div> : null,
  footer: showBlock("footer") ? <div data-block-key="footer">...</div> : null,
};

// Renderização:
const orderedKeys = props.visibleSections ?? Object.keys(blockMap);
return (
  <div className="min-h-screen bg-background">
    <SharedNav ... />
    {orderedKeys.map(key => blockMap[key] ?? null)}
  </div>
);
```

**Arquivo a editar:** apenas `src/components/store/PublicSiteRenderer.tsx` — refatorar os 4 templates para usar `blockMap` + renderização ordenada.

### Resultado
- Reordenar no sidebar → `visibleSections` chega na nova ordem → preview renderiza na ordem correta
- Site público (sem `visibleSections`) → ordem padrão mantida
- Visibilidade (hide/show) → continua funcionando via `showBlock`
