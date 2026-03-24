
## Problema

O `SelectContent` (dropdown de estágio) usa `z-50` por padrão. O botão X do `DialogContent` também é renderizado com `z-50`. Como ambos são portais no `document.body` e o X aparece **depois** no DOM, ele fica visualmente acima do dropdown.

Adicionar `z-[200]` no `SelectContent` inline via `className` prop não resolve porque o Tailwind utilitário `z-[200]` entra em conflito com o `z-50` já definido na classe base do componente — e a especificidade de CSS decide qual vence.

## Causa raiz

Em `src/components/ui/select.tsx`, linha 69:
```
"relative z-50 max-h-96 ..."
```

O `className` passado via prop é concatenado via `cn()`, mas quando há classes do mesmo tipo (`z-50` vs `z-[200]`), o **último declarado no CSS vence**, não o de maior prioridade. Como ambos são classes utilitárias Tailwind inline, a que está na string base (`z-50`) pode sobrescrever a customização dependendo da ordem gerada no bundle.

## Solução

**Alterar o `z-index` padrão do `SelectContent` em `src/components/ui/select.tsx`** de `z-50` para `z-[60]`.

Isso garante que **todos** os dropdowns Select do app sempre renderizem acima de dialogs/sheets (que usam `z-50`), sem precisar de override por instância.

## Arquivo a editar

- `src/components/ui/select.tsx` — linha 69: trocar `z-50` por `z-[60]` na classe base do `SelectContent`
