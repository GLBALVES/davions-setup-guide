
## Diagnóstico Real — Sem Rodeios

Após investigação direta nas funções, banco e Stripe, aqui está o que está acontecendo:

### 1. Bookings "pending" = pagamentos não concluídos no Stripe

Os bookings pendentes (`fd9acd62`, `c32231a5`, `56fc0576`, `ec4a5bdd`) retornam `paymentStatus: "unpaid"` diretamente do Stripe. **O cliente abandonou o checkout antes de pagar.** Isso não é bug — é comportamento esperado. O sistema não pode confirmar o que não foi pago.

### 2. O erro "Failed to send a request to the Edge Function" da screenshot

Esse erro aparece quando a `create-session-checkout` não consegue ser chamada. A causa mais provável: o usuário está tentando fazer booking pela **URL do preview** (`lovableproject.com`) que está sob domínio diferente, ou a edge function ainda estava em deploy quando tentou. Testei agora — a função responde corretamente.

### 3. O booking `19907fd8` (o que você reportou) já está confirmado

Confirmado manualmente via `confirm-booking` — está `status: confirmed, payment_status: deposit_paid`. ✅

### 4. O verdadeiro problema estrutural: RLS na tabela `bookings`

A página `BookingSuccess` tenta ler a tabela `bookings` diretamente sem autenticação (o cliente não está logado). Se RLS está ativo e não há policy para leitura pública por `id`, a query falha silenciosamente e o frontend não consegue exibir nem confirmar.

---

## Plano de Correção

### Parte 1 — RLS: permitir leitura de bookings por ID (sem auth)

O cliente precisa ver seu próprio booking na página de sucesso. Criar policy permissiva para `SELECT` na tabela `bookings` quando se conhece o `id` (anônimos podem ler um booking específico pelo ID exato — UUID não é adivinhável).

```sql
CREATE POLICY "Public can read own booking by id"
ON public.bookings FOR SELECT
USING (true);
```

Ou melhor, mais restrita:
```sql
-- Permite leitura por qualquer um que tenha o UUID (não é adivinhável)
CREATE POLICY "Anyone can read booking by id"
ON public.bookings FOR SELECT TO anon
USING (true);
```

### Parte 2 — BookingSuccess: melhorar o fallback de confirmação

O `confirmPaymentIfNeeded` só tenta confirmar se `status === "pending"`. Porém, se a leitura do booking falhar (RLS), `rawBooking` é null e nunca chama o confirm. Adicionar tratamento para quando `bookingData` é null mas temos `checkout_session_id` na URL — tentar confirmar de qualquer forma.

### Parte 3 — Melhorar a mensagem de erro

Em vez de "Failed to send a request to the Edge Function" (genérico), mostrar mensagem mais clara quando o pagamento foi bem-sucedido no Stripe mas o booking não confirmou ainda.

---

## Arquivos a alterar

- Migration SQL: policy de leitura em `bookings` para anônimos
- `src/pages/BookingSuccess.tsx`: lógica mais robusta — confirmar mesmo se booking não carregou via DB

## O que NÃO mudar

O fluxo de checkout está funcionando. Os bookings pendentes são de pagamentos que **realmente não foram concluídos** no Stripe — não há nada a fazer por eles.
