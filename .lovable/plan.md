
## Problema

As opções de edição de Header e Footer **existem** no `BlockPanel.tsx` — mas nunca aparecem no sidebar lateral. O `BlockPanel` só é renderizado como um painel flutuante dentro do `LivePreview`, e para Header/Footer esse painel flutuante não funciona bem (o header está no topo da página, o footer no rodapé — fora da área de scroll visível do canvas).

Quando o usuário clica em "Header / Nav" ou "Footer" no `FixedRow` do sidebar:
1. `activeBlock` é definido como "header" ou "footer" ✓
2. `WebsiteEditor.tsx` mantém o `EditorSidebar` visível (a árvore de páginas) — o `BlockPanel` nunca aparece no sidebar ✗
3. O painel flutuante do `LivePreview` existe mas é difícil de usar/ver para esses elementos fixos ✗

**Causa raiz**: O `WebsiteEditor.tsx` nunca renderiza o `BlockPanel` no sidebar esquerdo. A condição atual (linha 577) sempre mostra o `EditorSidebar` quando `activeBlock !== null` — nunca substitui pelo `BlockPanel`.

## Solução

Adicionar o `BlockPanel` no sidebar esquerdo do `WebsiteEditor.tsx` quando `activeBlock` está definido — **substituindo** o `EditorSidebar`. Isso é consistente com o padrão já esperado: clicar em uma seção ou em Header/Footer abre as opções de edição no painel lateral.

### Mudanças em `WebsiteEditor.tsx`

1. Importar `BlockPanel` de `@/components/website-editor/BlockPanel`
2. Adicionar terceiro estado no aside:
   - Se `activeBlock !== null` → mostrar `BlockPanel` com `blockKey={activeBlock}`, `data={effectiveSiteData}`, `onChange={handleDataChange}`, `onBack={() => setActiveBlock(null)}`
   - Se `pageContentPanelOpen && activePageId && !home` → mostrar `PageContentPanel`
   - Senão → mostrar `EditorSidebar`

```tsx
<aside className="w-[260px] ...">
  {/* 1. Block editor — shown when any block is actively selected */}
  {activeBlock !== null && (
    <BlockPanel
      blockKey={activeBlock}
      data={effectiveSiteData}
      onChange={handleDataChange}
      onBack={() => setActiveBlock(null)}
    />
  )}

  {/* 2. Page Content Panel — only when explicitly opened via Page Settings */}
  {activeBlock === null && pageContentPanelOpen && activePageId && !activePage?.is_home && (
    <PageContentPanel
      page={activePage}
      onBack={() => setPageContentPanelOpen(false)}
      onChange={handlePageContentChange}
    />
  )}

  {/* 3. Default: sidebar tree */}
  {activeBlock === null && (!pageContentPanelOpen || !activePageId || activePage?.is_home) && (
    <EditorSidebar ... />
  )}
</aside>
```

3. Remover o `BlockPanel` flutuante do `LivePreview` (ou mantê-lo apenas como indicador visual, sem o painel de edição duplicado). O painel de indicação/destaque da seção ativa continua, só o painel de edição flutuante será removido.

### Resultado
- Clicar em "Header / Nav" no sidebar → `BlockPanel` de Header abre no sidebar esquerdo com todas as opções (logo, cores, sociais, visibilidade) ✓
- Clicar em "Footer" → `BlockPanel` de Footer abre com templates, elementos e cores ✓
- Clicar em qualquer seção (Hero, About, etc.) → `BlockPanel` abre no sidebar ✓
- Botão "←" no `BlockPanel` → volta para o `EditorSidebar` ✓
- O indicador visual azul no canvas continua funcionando para mostrar qual seção está ativa ✓

**Arquivo a editar:** apenas `src/pages/dashboard/WebsiteEditor.tsx`
