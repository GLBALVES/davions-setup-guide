

## Corrigir badge "Entregue" saindo do card de enviados

### Problema
O `EmailListItem` tem altura fixa `h-[72px]` (linha 140). Quando o `extraBadge` (badge "Entregue"/"Aguardando") é renderizado na linha 155-156, o conteúdo excede a altura fixa e o badge fica visualmente fora do card.

### Correção
**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

**Linha 140:** Trocar `h-[72px]` por `min-h-[72px]` para permitir que o card cresça quando tiver badge extra, ou alternativamente aumentar a altura fixa para `h-[88px]` para acomodar o badge.

A melhor abordagem é usar `min-h-[72px]` — cards sem badge mantêm o tamanho padrão, cards com badge crescem naturalmente. Adicionar também `overflow-hidden` como segurança.

