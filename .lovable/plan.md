# Conflito de agendamento entre projetos

## Causa raiz

Não é específico do macOS — é uma lacuna na validação. A função `checkBookingConflict` (`src/lib/booking-conflict.ts`) só consulta as tabelas `blocked_times` e `bookings`. Ela **nunca consulta `client_projects`**.

Resultado: ao alterar um projeto cujo horário coincide com outro projeto (especialmente projetos sem `booking_id` vinculado, ou dois projetos virtuais no mesmo slot), nenhum conflito é detectado e o save passa.

## Mudanças

### 1. `src/lib/booking-conflict.ts`

- Adicionar parâmetro opcional `excludeProjectId?: string` em `checkBookingConflict`.
- Após checar `blocked_times` e `bookings`, fazer uma terceira consulta em `client_projects`:
  - filtrar por `photographer_id`, `shoot_date = date`, `shoot_time IS NOT NULL`, `stage != 'archived'`, e `id != excludeProjectId`.
  - para cada projeto encontrado, calcular `end_time` a partir da `duration_minutes` da `session` vinculada (via `session_type` → `sessions.title`) ou fallback 60min.
  - se `timesOverlap` → retornar `{ hasConflict: true, conflictType: "booking", conflictDetails: "Conflicts with project '<title>' (HH:mm–HH:mm)" }`.

### 2. `src/components/dashboard/ProjectDetailSheet.tsx` (`commitSave`)

- Passar `project.id` como `excludeProjectId` nas duas chamadas de `checkBookingConflict` (com e sem `booking_id`), para o projeto não conflitar consigo mesmo.

### 3. `src/pages/dashboard/Projects.tsx` (`handleSave`)

- Quando estiver editando (id existente), passar o `id` do projeto como `excludeProjectId`.
- Em criação, sem id, deixar `undefined`.

## Notas

- Não tocar em UI nem em outras regras.
- Mensagem de toast de conflito já existe; reusa o mesmo fluxo.
- One-session continua tendo seu fluxo de aviso/permissão próprio — não alterado.
