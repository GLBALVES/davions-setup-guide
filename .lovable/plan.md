
## Diagnóstico do Problema

### Causa raiz: o `LivePreview` ignora a página ativa

Ao clicar em uma página customizada no sidebar, o `handleSelectPage` define `activePageId` corretamente. Mas o `livePreviewProps` passa `sections: activePageSections` ao `LivePreview`, que por sua vez passa `visibleSections` ao `PublicSiteRenderer`.

O problema está na linha 392–394 do `WebsiteEditor.tsx`:

```ts
const activePage = activePageId ? pages.find((p) => p.id === activePageId) : null;
const activePageSections: SectionDef[] = activePage && !activePage.is_home
  ? ((activePage.sections_order as SectionDef[]) ?? [])
  : sections;
```

Quando uma página customizada **não tem seções** (array vazio), `activePageSections` é `[]`. O `LivePreview` passa `visibleSections={[]}` ao renderer — e o `PublicSiteRenderer` interpreta um array vazio como "não há seções para mostrar", então renderiza vazio ou reverte para o comportamento padrão, que são as seções da Home.

Mas há **um segundo problema maior**: o `PublicSiteRenderer` nunca muda de conteúdo porque o `data` sempre é o global `siteData`. Páginas customizadas têm seu conteúdo em `page.page_content` (`page_headline`, `page_body`, etc.), e esse conteúdo **nunca é passado** ao `PublicSiteRenderer`.

### Dois problemas confirmados:

1. **`visibleSections`**: quando uma página customizada tem seções, o array é passado corretamente. Mas o `PublicSiteRenderer` usa `showBlock(key)` que só filtra baseado no array. O conteúdo textual (headline, body, cover, etc.) da página nunca é injetado.

2. **A sidebar esconde o `EditorSidebar` quando `activePageId !== null` e a página não é Home** (linha 532–541 do WebsiteEditor). Isso já funciona para mostrar o `PageContentPanel`. **O preview no entanto ainda mostra o conteúdo da home.**

### Solução

**`WebsiteEditor.tsx`** — passar o conteúdo da página ativa ao `LivePreview` quando for uma página customizada:

```ts
// Merge page_content into siteData when a custom page is active
const effectiveSiteData = activePage && !activePage.is_home && activePage.page_content
  ? {
      ...siteData,
      site_headline: (activePage.page_content as PageContent).page_headline ?? siteData.site_headline,
      site_subheadline: (activePage.page_content as PageContent).page_subheadline ?? siteData.site_subheadline,
      site_hero_image_url: (activePage.page_content as PageContent).page_cover_url ?? siteData.site_hero_image_url,
      cta_text: (activePage.page_content as PageContent).page_cta_text ?? siteData.cta_text,
      cta_link: (activePage.page_content as PageContent).page_cta_link ?? siteData.cta_link,
    }
  : siteData;
```

E usar `effectiveSiteData` em vez de `siteData` no `livePreviewProps`.

**Problema de array vazio**: quando uma página customizada não tem seções, o preview fica em branco. Isso é correto — a página está vazia. Mas se o usuário nunca adicionou seções, a página deve mostrar pelo menos o bloco de conteúdo básico (headline/body/cover). 

Para isso, quando `activePageSections` está vazio E a página tem `page_content`, exibir pelo menos uma seção placeholder `hero` no preview:

```ts
const activePageSections: SectionDef[] =
  activePage && !activePage.is_home
    ? (() => {
        const order = (activePage.sections_order as SectionDef[]) ?? [];
        // Se não há seções definidas mas há page_content, mostrar hero por padrão
        if (order.length === 0) return [{ key: "hero", label: "Hero", icon: "🖼️", visible: true }];
        return order;
      })()
    : sections;
```

**Arquivos a editar:**
- `src/pages/dashboard/WebsiteEditor.tsx` — único arquivo, 2 mudanças:
  1. Adicionar `effectiveSiteData` que mescla `page_content` da página ativa
  2. Ajustar `activePageSections` para exibir `hero` por padrão quando uma página customizada não tem seções ainda
