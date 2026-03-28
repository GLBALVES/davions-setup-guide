

## Plano: Corrigir popover do sininho que não abre

### Problema
O `PopoverTrigger` está envolvido por um `Tooltip` (Radix). Isso causa conflito — o Tooltip captura o clique e impede o Popover de abrir corretamente. Na session replay, vemos o tooltip "Notifications" aparecendo mas o popover não renderiza.

### Solução
Remover o `Tooltip` de dentro do `PopoverTrigger`. Mover o tooltip para fora ou simplesmente removê-lo (o popover header já mostra "Notifications").

### Alteração

**`src/components/dashboard/NotificationBell.tsx`** (linhas 127-141)

Substituir a estrutura `PopoverTrigger > Tooltip > TooltipTrigger > button` por `PopoverTrigger > button` direto, sem tooltip:

```tsx
<PopoverTrigger asChild>
  <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-200 relative">
    <Bell size={15} />
    {unread > 0 && (
      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none">
        {unread > 99 ? "99+" : unread}
      </span>
    )}
  </button>
</PopoverTrigger>
```

Remove as importações de `Tooltip`, `TooltipContent`, `TooltipTrigger` se não forem usadas em outro lugar do arquivo.

### Impacto
- O tooltip "Notifications" ao hover é removido (aceitável — o ícone de sino é universalmente reconhecido e o header do popover já mostra o título)
- O popover passa a abrir normalmente ao clicar no sininho

