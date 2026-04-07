

## Validação de Conflitos e Sincronização de Datas/Horários entre Agenda, Bookings e Workflow

### Problema identificado

1. **Sem validação de conflito ao editar datas/horários**: No `ProjectDetailSheet.tsx` (Workflow), o fotógrafo pode alterar `shoot_date` e `shoot_time` livremente sem verificar conflitos com outros agendamentos existentes.

2. **Sem sincronização entre os 3 locais**: Quando a data/hora é alterada no Workflow (`client_projects.shoot_date/shoot_time`), os dados do booking correspondente (`bookings.booked_date` + `session_availability.date/start_time/end_time`) NÃO são atualizados, e vice-versa. As 3 telas (Schedule, Bookings, Workflow) leem de tabelas diferentes.

3. **Datas inconsistentes**: O Schedule/Bookings lê de `session_availability.date` + `start_time/end_time`, enquanto o Workflow lê de `client_projects.shoot_date/shoot_time`. Esses dados podem divergir.

### Arquitetura dos dados

```text
Schedule/Bookings:
  bookings.booked_date ← data principal
  session_availability.date/start_time/end_time ← horários detalhados

Workflow (Projects):
  client_projects.shoot_date / shoot_time ← campos independentes
  client_projects.booking_id → referência ao booking
```

### Alterações planejadas

#### 1. Adicionar validação de conflito no ProjectDetailSheet (Workflow)

**Arquivo:** `src/components/dashboard/ProjectDetailSheet.tsx`

Quando o fotógrafo editar `shoot_date` ou `shoot_time` no painel de detalhes do projeto:
- Antes de salvar, consultar `bookings` + `session_availability` para verificar se o novo horário conflita com agendamentos existentes (excluindo o próprio booking do projeto)
- Exibir alerta visual se houver conflito, bloqueando o salvamento
- Reutilizar a mesma lógica `timesOverlap` já existente no `CreateBookingDialog`

#### 2. Sincronizar alterações bidirecionalmente

**Arquivo:** `src/components/dashboard/ProjectDetailSheet.tsx`

Na função `save()`, quando `shoot_date` ou `shoot_time` for alterado e o projeto tiver um `booking_id`:
- Atualizar também `bookings.booked_date` com a nova data
- Atualizar `session_availability.date`, `start_time` e `end_time` (recalculando end_time com base na duração da sessão)

**Arquivo:** `src/components/dashboard/schedule/BookingDetailSheet.tsx`

Atualmente o BookingDetailSheet não permite editar data/hora — apenas visualiza. Isso é seguro por enquanto, mas se for adicionado edição futuramente, a mesma lógica de sync deverá ser aplicada.

#### 3. Criar utilitário compartilhado de validação de conflito

**Novo arquivo:** `src/lib/booking-conflict.ts`

Extrair as funções `timeToMinutes`, `timesOverlap`, e uma nova função `checkBookingConflict(photographerId, date, startTime, endTime, excludeBookingId?)` que:
- Consulta `bookings` + `session_availability` para a data
- Consulta `blocked_times` para a data
- Retorna `{ hasConflict, conflictType, conflictDetails }` 

Será usado por:
- `CreateBookingDialog` (já tem lógica inline — migrar para usar o utilitário)
- `ProjectDetailSheet` (nova validação)

#### 4. Garantir formato correto de datas em todos os locais

**Arquivos:** `BookingDetailSheet.tsx`, `MonthView.tsx`, `WeekView.tsx`, `DayView.tsx`, `Bookings.tsx`

Padronizar o parsing de datas usando o padrão `T00:00:00` já estabelecido no projeto para evitar timezone shifting:
- `formatDate` no `BookingDetailSheet` (linha 167): `new Date(s)` → `new Date(s + "T00:00:00")` quando `s` é date-only
- Verificar e corrigir nos demais componentes

### Resumo visual

```text
Antes:
  Workflow edita shoot_date → NÃO atualiza booking → datas divergem
  Nenhuma validação de conflito ao editar

Depois:
  Workflow edita shoot_date → valida conflito → atualiza booking + availability
  Utilitário compartilhado de conflito usado em todas as telas
  Datas parseadas consistentemente com T00:00:00
```

### Detalhes técnicos

- O utilitário `checkBookingConflict` fará 2 queries ao banco (bookings+availability e blocked_times) — são queries leves filtradas por data e photographer_id
- A sincronização será feita em cascata: `client_projects` → `bookings.booked_date` → `session_availability.date/start_time/end_time`
- Para calcular `end_time`, buscaremos `sessions.duration_minutes` via o `session_id` do booking
- Traduções i18n necessárias: mensagens de erro de conflito ("This time conflicts with...", "Slot blocked...")

