
## Problema raiz

No componente `PageRow` (`EditorSidebar.tsx`), o `div` container da linha não tem um handler `onClick` vinculado a `onSelect()`. Para páginas não-home, o span do título chama `e.stopPropagation()` no clique simples (para não conflitar com o duplo clique de renomear) — mas nunca chama `onSelect()`. O resultado: clicar em qualquer página customizada não aciona a seleção.

```tsx
// Div externo — SEM onClick → onSelect nunca é chamado
<div className="group flex items-center gap-1.5 ...">
  <span
    onClick={(e) => {
      if (page.is_home) onSelect();     // ✓ home chama onSelect
      else e.stopPropagation();         // ✗ não-home apenas bloqueia propagação
    }}
  >
```

## Solução

**`EditorSidebar.tsx` — `PageRow`**:

1. Adicionar `onClick={() => onSelect()}` no `div` container da linha (para capturar cliques em qualquer área da linha).
2. Corrigir o span do título: remover o `e.stopPropagation()` do clique simples em não-home, e deixar o duplo clique (`onDoubleClick`) cuidar exclusivamente do rename — para evitar conflito, usar um pequeno timer para distinguir clique simples de duplo clique, ou simplesmente aceitar que o duplo clique também aciona a seleção (comportamento padrão aceitável).
3. Os botões de ação (add section, visibility, delete, dropdown) já têm `e.stopPropagation()` e continuam funcionando corretamente.

**Comportamento após a correção:**
- Clique simples em qualquer página → `onSelect(page.id)` → `handleSelectPage(id)` → `activePageId` atualizado → `effectiveSiteData` e `activePageSections` computados → preview recarrega com conteúdo da página

**Arquivo a editar:**
- `src/components/website-editor/EditorSidebar.tsx` — apenas o `PageRow`, 2 mudanças pequenas
