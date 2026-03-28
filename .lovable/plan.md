

## Plano: Agrupar notificações por tipo no sininho

### O que muda
Adicionar **filtros por grupo** no popover do sininho, permitindo ao usuário focar em um tipo de notificação por vez.

### Alterações

**1. `src/components/dashboard/NotificationBell.tsx`**
- Adicionar uma barra de filtros horizontais abaixo do header do popover com chips: `All`, `Bookings`, `Payments`, `Chat`, `Bugs`
- Cada chip filtra `items` pelo campo `event` correspondente
- Estado local `activeFilter` (default: `"all"`)
- Mostrar contagem de não-lidos por grupo em cada chip
- Mapeamento: `new_booking` → Bookings, `payment_received`/`payment_failed` → Payments, `new_chat_message` → Chat, `new_bug_report` → Bugs

**2. `src/lib/i18n/translations.ts`**
- Adicionar chaves `notif.filterAll`, `notif.filterBookings`, `notif.filterPayments`, `notif.filterChat`, `notif.filterBugs` em EN/PT/ES

### Layout visual

```text
┌─────────────────────────────────────┐
│ Notifications          [Mark all ✓] │
├─────────────────────────────────────┤
│ [All 5] [Bookings 2] [Payments 1]  │
│ [Chat 1] [Bugs 1]                  │
├─────────────────────────────────────┤
│ 📅 New booking from John...        │
│ 📅 New booking from Maria...       │
│ ...                                │
└─────────────────────────────────────┘
```

Chips com badge de contagem não-lida, chip ativo com `bg-foreground text-background`, scroll horizontal em mobile.

