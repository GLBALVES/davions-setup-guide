

## Corrigir conteúdo duplicado no AdminLayout

### Problema
O `AdminLayout.tsx` renderiza `{children}` duas vezes (linhas 52-57), causando toda a interface do email aparecer duplicada.

### Correção
Arquivo: `src/components/admin/AdminLayout.tsx`

Remover o segundo `<div>` que renderiza `{children}` duplicado. O bloco `<main>` ficará assim:

```tsx
<main className="flex-1 overflow-y-auto">
  {children}
</main>
```

Uma única alteração, uma linha efetiva.

