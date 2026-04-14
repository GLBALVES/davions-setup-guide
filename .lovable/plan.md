

## O botão de trocar sessão está apenas no BookingDetailSheet (Schedule)

O botão "Edit" (ícone de lápis ao lado de "Session") foi implementado apenas no `BookingDetailSheet` — acessível pela página **Schedule** (`/dashboard/schedule`). Na página **Projects/Workflow** (`/dashboard/projects`), o painel que abre é o `ProjectDetailSheet`, que **não tem** esse botão.

### Solução

Adicionar a mesma funcionalidade de troca de sessão do booking no `ProjectDetailSheet`, visível quando o projeto tem um `booking_id` vinculado.

### Implementação

**Arquivo: `src/components/dashboard/ProjectDetailSheet.tsx`**

1. Na seção "Session" (linhas ~1373-1428), quando `project.booking_id` existir, adicionar um botão "Edit" (ícone Pencil) ao lado do label da seção
2. Ao clicar, carregar as sessions ativas do fotógrafo e exibir um Popover/dropdown para seleção
3. Ao selecionar nova session, verificar se há `booking_invoice_items` (add-ons) — se sim, abrir o `AddonReviewModal` (extrair como componente compartilhado ou duplicar inline)
4. Executar a mesma lógica de `executeSessionChange` do BookingDetailSheet: atualizar `bookings.session_id`, recalcular financeiro (tax, extras_total, balance), sincronizar `session_availability.end_time`
5. Chamar `onUpdate` para refletir as mudanças no board

**Refatoração recomendada**: Extrair `AddonReviewModal` e a lógica de `executeSessionChange` / `handleSessionSelect` do `BookingDetailSheet` para um hook ou componente compartilhado (`src/lib/session-change.ts` + componente separado), evitando duplicação de ~150 linhas.

### Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/components/dashboard/schedule/BookingDetailSheet.tsx` | Extrair `AddonReviewModal` e lógica de troca para módulos reutilizáveis |
| `src/components/dashboard/AddonReviewModal.tsx` | Novo — modal de revisão de add-ons (extraído) |
| `src/lib/session-change.ts` | Novo — lógica compartilhada de troca de sessão e recálculo financeiro |
| `src/components/dashboard/ProjectDetailSheet.tsx` | Importar e usar o botão de troca de sessão na seção Session, quando `booking_id` existir |

