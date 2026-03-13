
## Alinhar logo do rodapé à esquerda

### Problema
A div do logo no rodapé (linha 388) usa `flex flex-col gap-3` sem alinhamento explícito. Como está dentro de um `flex-col` no mobile, os itens são centralizados pelo browser em alguns contextos. Precisa adicionar `items-start` para garantir alinhamento à esquerda.

### Mudança
**`src/pages/Index.tsx` — linha 388**

```tsx
// antes
<div className="flex flex-col gap-3">

// depois
<div className="flex flex-col gap-3 items-start">
```

Uma linha, resultado imediato.
