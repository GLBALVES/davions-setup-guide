
## Diagnóstico

O usuário clica em **PUBLISH**, abre nova aba do site público, mas o conteúdo está desatualizado. Investigando:

1. **Service Worker não cacheia** (`public/sw.js` só trata push) — não é cache de SW.
2. **`StorePage.tsx` lê `page_content.sections`** corretamente do banco em cada navegação.
3. **Bug real em `WebsiteEditor.tsx` linha 1592–1629 (`findAndUpdate`)**: ao montar o `dbPatch.page_content`, faz:
   ```ts
   setPages(prev => prev.map(...));         // agenda update assíncrono
   const allP = flattenPages(pages);         // ← LÊ O ESTADO ANTIGO (stale closure)
   const current = allP.find(p => p.id === id);
   const merged = { ...current, ...patch };  // current está stale
   dbPatch.page_content = { ...merged.sections ... };
   persistUpdate(id, dbPatch);
   ```
   `pages` é a referência capturada na renderização anterior. Quando o usuário faz duas edições em sequência rapidamente (ex: muda texto do bloco A, depois texto do bloco B), a segunda chamada ainda lê `pages` *sem* a primeira mudança → o `page_content` salvo no DB **sobrescreve a edição anterior** com a versão antiga das outras seções.

   Resultado: o site público lê do DB um `page_content` que perdeu edições recentes → "versão desatualizada".

4. **Cache-buster `?v=timestamp`** no botão Publish é inútil porque o problema não é cache do navegador — o DB realmente tem dados velhos.

## Correção

Usar a forma funcional de `setPages` para calcular o `dbPatch` a partir do estado **mais recente**, garantindo que cada save reflita todas as edições anteriores:

```ts
const findAndUpdate = (id: string, patch: Partial<SitePage>) => {
  setPages((prev) => {
    const next = prev.map((p) => {
      if (p.id === id) return { ...p, ...patch };
      if (p.children) {
        return { ...p, children: p.children.map((c) => c.id === id ? { ...c, ...patch } : c) };
      }
      return p;
    });

    // Build dbPatch from the FRESH next state (not stale `pages`)
    const dbPatch: Record<string, any> = {};
    if (patch.label !== undefined) { dbPatch.title = patch.label; dbPatch.slug = slugify(patch.label); }
    if (patch.inMenu !== undefined) dbPatch.is_visible = patch.inMenu;
    if (patch.slug !== undefined) dbPatch.slug = patch.slug;

    const allP = flattenPages(next);
    const merged = allP.find((p) => p.id === id);
    if (merged) {
      dbPatch.page_content = JSON.parse(JSON.stringify({
        type: merged.type, icon: merged.icon, status: merged.status,
        showHeaderFooter: merged.showHeaderFooter, templateId: merged.templateId,
        sections: merged.sections, pageTitle: merged.pageTitle,
        pageDescription: merged.pageDescription, hideFromSearch: merged.hideFromSearch,
        socialImage: merged.socialImage,
      }));
      dbPatch.sections_order = merged.sections ? merged.sections.map(s => s.type) : [];
    }
    persistUpdate(id, dbPatch);
    return next;
  });
  if (settingsPage?.id === id) setSettingsPage((prev) => prev ? { ...prev, ...patch } : null);
};
```

Pontos da correção:
- `setPages` funcional → garante leitura do estado fresco.
- `dbPatch` calculado **dentro** do updater a partir de `next`.
- Adiciona `sections_order` no patch (estava só em insert, não em update — outro motivo de drift entre o que está no editor e no público).

## Arquivos

- `src/pages/dashboard/WebsiteEditor.tsx` — refatorar `findAndUpdate` (linhas 1592–1630).
