
## Diagnóstico

Quando uma seção de uma página customizada é clicada no sidebar:

1. `onSelect` do `SortableItem` chama `onSelectPage(page.id)` + `onSelectBlock(section.key)` — correto
2. `activePageId` passa a ser não-nulo e a página não é home
3. `WebsiteEditor.tsx` linhas 562–571 detectam isso e **substituem o `EditorSidebar` pelo `PageContentPanel`**
4. O `BlockPanel` para editar a seção nunca aparece — o usuário vê as propriedades gerais da página

Na Home: `onSelectPage(null)` → `activePageId` fica `null` → `EditorSidebar` permanece visível → `BlockPanel` renderiza normalmente para a seção.

## Solução

A lógica de renderização do sidebar precisa de um terceiro estado:

```text
activePageId == null                     → EditorSidebar (home)
activePageId != null AND activeBlock != null → EditorSidebar (seção da página customizada)
activePageId != null AND activeBlock == null → PageContentPanel (propriedades da página)
```

### Mudança em `WebsiteEditor.tsx`

**Condição para mostrar `PageContentPanel`** (linha 562):
```ts
// Antes:
activePageId !== null && página não é home

// Depois:
activePageId !== null && página não é home && activeBlock === null
```

**Condição para mostrar `EditorSidebar`** (linha 574):
```ts
// Antes:
activePageId === null || página é home

// Depois:
activePageId === null || página é home || activeBlock !== null
```

**Ao selecionar uma página (sem bloco ativo)** — `handleSelectPage` deve limpar `activeBlock`:
```ts
const handleSelectPage = (id: string | null) => {
  setActivePageId(id);
  setActiveBlock(null); // limpa seleção de seção
};
```

Isso garante que:
- Clicar numa **página** (não numa seção) → `activeBlock = null` → `PageContentPanel` abre
- Clicar numa **seção** de página customizada → `activeBlock = section.key` → `EditorSidebar` fica visível com `BlockPanel` renderizado para aquela seção

### Resultado
- Clicar seção de página customizada → abre o painel de edição da seção (igual à Home) ✓
- Clicar na página (nome) → abre `PageContentPanel` para editar título, cover, headline etc. ✓
- Comportamento da Home → inalterado ✓

**Arquivo a editar:** apenas `src/pages/dashboard/WebsiteEditor.tsx` — 3 mudanças pequenas nas linhas 562–574 e em `handleSelectPage`.
