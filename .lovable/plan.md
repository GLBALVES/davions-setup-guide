## Objetivo
Quando uma sessão tiver `balance_due_timing = 'session_day'` e o booking deixar saldo restante (deposit pago, balance pendente), disparar **automaticamente** um email com lembrete e **link de pagamento Stripe** para o cliente, no horário definido pelo offset (ex.: 24h antes, no início, 2h depois).

## Como funciona hoje (resumo)

- `sessions.balance_due_timing` ∈ {`session_day`, `gallery_checkout`, `after_delivery`}
- `sessions.balance_due_offset_hours`: inteiro com sinal — negativo = horas antes; 0 = no início da sessão; positivo = horas depois.
- Bookings com `deposit_enabled=true` pagam só o `depositBase` no checkout; o `remainingBalance` fica pendente em Stripe (`deposit_paid` flag, sem invoice).
- `workflow-email-cron` é uma edge function que varre triggers e chama `send-workflow-email` (que mescla template + variáveis e envia via SMTP do photographer). Há tabela `workflow_email_dispatched` para dedupe.
- Templates ficam em `workflow_email_templates` com `stage_trigger` único por photographer.

## Implementação

### 1. Migração: adicionar trigger `balance_due_session_day`
- Atualizar o tipo CHECK do schema (não há check no `workflow_email_templates`, é texto livre — não precisa migration).
- **Sem nova tabela.** Reutilizar `workflow_email_templates` e `workflow_email_dispatched`.
- Indexar `bookings(payment_status, booked_date)` se já não existir, para a varredura do cron.

### 2. Edge function nova: `create-balance-payment-link`
- Recebe `booking_id` (server-to-server).
- Busca booking + session + valor restante.
- Cria um Stripe Checkout Session (modo `payment`, sem subscription) cobrando o `remainingBalance` na conta Connect do photographer.
- Retorna `{ url }`. Inclui `metadata.booking_id`, `metadata.payment_kind = 'balance_due'`.
- Webhook `session-booking-webhook` (existente) já trata pagamentos via metadata — adicionar branch para marcar `payment_status='paid'` no booking quando `payment_kind='balance_due'`.

### 3. Edge function nova: `get-balance-payment-link`
- Endpoint **público** (verify_jwt=false) que recebe um `token` (assinado) e:
  - decifra `booking_id` + `expires_at`
  - chama internamente `create-balance-payment-link`
  - faz redirect 302 para a URL do Stripe Checkout
- Por que via redirect: o link no email precisa ser estável e clicável depois; criar a session Stripe na hora evita expiração do link Stripe (24h).
- Token = `base64url(JSON{booking_id, exp})` + HMAC-SHA256 com `SUPABASE_SERVICE_ROLE_KEY` (suficiente para impedir adivinhação).

### 4. Modificar `workflow-email-cron`
Adicionar quarta seção:
```
4) balance_due_session_day — bookings com deposit pago, sessão com balance_due_timing='session_day',
   offset hours definido, ainda não dispatched, e cujo "fire time" (booked_date + start_time + offset_hours)
   já passou (ou está dentro de uma janela de tolerância de 1h).
```
- Query: `bookings` join `sessions` join `session_availability` filtrando `payment_status IN ('deposit_paid')` e `sessions.deposit_enabled=true` e `sessions.balance_due_timing='session_day'`.
- Calcular `fire_at = booked_date + start_time + (offset_hours * 1h)`.
- Disparar quando `now() >= fire_at` e `now() < fire_at + 24h` (limite de janela).
- Vars enviadas ao template: `client_name`, `shoot_date`, `shoot_time`, `session_type`, `balance_amount`, `payment_link` (URL do `get-balance-payment-link?token=…`), `studio_name`.

### 5. Frontend — `WorkflowEmailTemplates.tsx`
- Adicionar `"balance_due_session_day"` em uma nova categoria `PAYMENT_TRIGGERS`.
- Adicionar `DEFAULT_CONTENT` em PT/EN/ES (subject + html) — ex.:
  ```
  Subject: "Lembrete: pagamento da sessão {{session_type}}"
  Body: explica que o saldo de {{balance_amount}} pode ser quitado em {{payment_link}}.
  ```
- Adicionar nova variável `{{payment_link}}` e `{{balance_amount}}` em `VARIABLES` e `SAMPLE_PREVIEW`.
- Aba Help / texto explicativo: o disparo segue o offset configurado em **Sessions → Payment → On the session day**.

### 6. Webhook update
Em `session-booking-webhook`:
```
if (metadata.payment_kind === 'balance_due') {
  await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', metadata.booking_id);
  // dispara workflow trigger 'balance_due_paid' opcional (fora deste escopo)
}
```

### 7. Cron schedule
- O cron `workflow-email-cron` já roda periodicamente (assumindo job pg_cron existente). Validar que está em pelo menos 15 min de cadência. Se rodar de hora em hora, a janela de tolerância de 1h cobre.
- Se não houver job, criar via `supabase--insert`:
  ```sql
  select cron.schedule('workflow-email-cron', '*/15 * * * *',
    $$ select net.http_post(url:='…/functions/v1/workflow-email-cron', headers:=…) $$);
  ```
  (verificar antes se já existe — não duplicar.)

## Considerações
- **Dedupe**: a unique constraint `(photographer_id, trigger, project_id, booking_id, gallery_id)` em `workflow_email_dispatched` impede disparo duplicado para o mesmo booking.
- **Pausados**: `send-workflow-email` já ignora projects pausados.
- **Auto-send**: respeitar `template.auto_send` e `template.enabled`.
- **Sem deposit**: se `deposit_enabled=false` e `balance_due_timing='session_day'`, o booking já é pago integralmente no checkout — pular.
- **Status do booking**: ignorar bookings cancelados (`status='cancelled'`).
- **i18n**: subject/body em PT padrão, mas o photographer pode editar; helper de texto multilíngue só em DEFAULT_CONTENT.

## Arquivos tocados
- `supabase/functions/create-balance-payment-link/index.ts` *(novo)*
- `supabase/functions/get-balance-payment-link/index.ts` *(novo, verify_jwt=false)*
- `supabase/functions/workflow-email-cron/index.ts` *(adicionar bloco 4)*
- `supabase/functions/session-booking-webhook/index.ts` *(branch balance_due no webhook)*
- `supabase/config.toml` *(verify_jwt=false para get-balance-payment-link)*
- `src/components/dashboard/WorkflowEmailTemplates.tsx` *(novo trigger + defaults + variáveis)*
- *(opcional)* `supabase/insert` — agendar cron se não existe
