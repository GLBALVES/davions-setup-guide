
## Diagnóstico real do problema

O fluxo de dados atual ao adicionar uma seção em uma página customizada:

1. Usuário clica `+` na página customizada → `onAddSection(pageId)` chamado corretamente
2. `setAddBlockState({ open: true, insertAfter: count, targetPageId: pageId })` — correto
3. Usuário confirma no modal → `handleAddBlock(blockKey, insertAfterIndex)` — salva no `site_pages.sections_order` corretamente
4. **Problema**: `setActivePageId(targetPageId)` é chamado, mas o `LivePreview` sempre renderiza o mesmo `PublicSiteRenderer` sem distinção de página — ele renderiza as seções de `activePageSections` (prop passada), mas o `PublicSiteRenderer` ignora completamente esse array e renderiza tudo fixo baseado em booleanos `show_*` e seções hardcoded.

### O problema real está em dois lugares:

**1. `WebsiteEditor.tsx`**: O `livePreviewProps` passa `sections: activePageSections`, mas o `PublicSiteRenderer` não usa esse array para decidir O QUE renderizar — ele tem sua própria lógica interna.

**2. `PublicSiteRenderer.tsx`**: Recebe `sections` prop? **Não recebe**. O renderer sempre renderiza todas as seções visíveis com base nos campos `show_*` de `siteConfig`, independente de qual página está ativa.

### Solução

O `PublicSiteRenderer` precisa receber uma prop `visibleSections: string[] | null` (null = renderiza tudo como hoje). Quando passada, renderiza **somente** as seções cujas keys estão no array, na ordem definida.

**Arquivos a editar:**

1. **`src/components/store/PublicSiteRenderer.tsx`** — adicionar prop `visibleSections?: string[] | null` ao componente principal; envolver cada bloco (hero, sessions, portfolio, about, testimonials, quote, experience, contact) numa condição `!visibleSections || visibleSections.includes('hero')` etc., e também respeitar a ordem do array quando renderizar.

2. **`src/components/website-editor/LivePreview.tsx`** — passar `visibleSections` para o `PublicSiteRenderer` baseado no `sections` prop que já recebe (filtrar as `visible: true` e extrair as keys em ordem).

3. **`src/pages/dashboard/WebsiteEditor.tsx`** — nenhuma mudança necessária, já passa `sections: activePageSections` corretamente ao `LivePreview`.

### Comportamento resultante

- Home page selecionada → `activePageSections` = `sections` global → `PublicSiteRenderer` renderiza todas as seções visíveis na ordem salva
- Página customizada selecionada → `activePageSections` = `page.sections_order` → `PublicSiteRenderer` renderiza somente aquelas seções naquela ordem
- Seção adicionada à página customizada aparece imediatamente no preview porque o `activePageSections` é atualizado no estado e o preview re-renderiza com o novo array
