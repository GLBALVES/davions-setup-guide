## Situação atual

A função `create-invoice-payment-link` já gera o checkout (Pagar.me ou Stripe) marcando `metadata.payment_kind = "project_invoice"` e `invoice_id`. Mas **nenhum webhook trata essa baixa hoje**:

- `pagarme-webhook` só atualiza `bookings` quando recebe `metadata.booking_id`.
- `session-booking-webhook` (Stripe) idem — só lida com `booking_id` / `balance_due`.

Resultado: o pagamento entra na conta do fotógrafo, mas a `project_invoice` permanece com `status='pending'` e `paid_amount=0`. A "baixa" só acontece se o usuário marcar manualmente.

## O que o plano vai fazer

Adicionar tratamento de `payment_kind === "project_invoice"` nos dois webhooks já existentes — sem criar webhook novo, sem mexer no front.

### 1) `supabase/functions/pagarme-webhook/index.ts`

Quando `eventType` for `charge.paid` ou `order.paid` **e** `metadata.payment_kind === "project_invoice"` **e** existir `metadata.invoice_id`:

- Ler `project_invoices` (amount, paid_amount, status).
- Somar o valor recebido (em reais, dividindo `amount` do Pagar.me por 100) ao `paid_amount`.
- Se `paid_amount >= amount` → `status = 'paid'`, `paid_at = now()`.
- Senão → `status = 'partial'` (mantém a coluna existente).
- Idempotência: já garantida pelo bloco existente que checa `webhook_events` por `external_id`.

Para `charge.payment_failed` / `order.payment_failed` com `payment_kind === "project_invoice"`: apenas logar — não mudar status (mantém `pending` para o cliente tentar de novo).

### 2) `supabase/functions/session-booking-webhook/index.ts`

No bloco `checkout.session.completed`, antes do branch atual de `bookingId`, adicionar:

- Se `session.metadata.payment_kind === "project_invoice"` e `session.metadata.invoice_id`:
  - Mesma lógica acima usando `session.amount_total / 100` (cents → reais, pois a tabela guarda em unidade maior).
  - Atualizar `paid_amount`, `status`, `paid_at`.
  - `return` cedo para não cair no fluxo de booking.

### 3) Telemetria

Logar via `logWebhookEvent` o resultado (já existe nos dois arquivos) com `event_type` original.

## Não incluso (fora de escopo)

- Não vou criar tabela nem migration — `project_invoices` já tem todas as colunas (`paid_amount`, `paid_at`, `status`, `pagarme_order_id`).
- Não vou alterar a UI do `ProjectDetailSheet` — ela já lê esses campos.
- Não vou adicionar realtime — o usuário recarrega/reabre o sheet para ver baixa, igual ao resto.

## Observação importante sobre Stripe Connect

Os pagamentos de invoice no exterior usam `stripe.checkout.sessions.create({...}, { stripeAccount })`. Para o webhook receber esses eventos, ele **precisa estar registrado como Connect webhook** (não somente account webhook). Vou validar no código se o `event.account` está presente e processar normalmente. Caso o webhook atual não esteja configurado como Connect na conta da plataforma, sinalizo no fim para você habilitar em `Developers → Webhooks → Connect` apontando para a mesma URL `session-booking-webhook`.
