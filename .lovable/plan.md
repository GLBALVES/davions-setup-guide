# Checkout Transparente Pagar.me — PIX, Cartão e Boleto

Substitui o redirect para o checkout hospedado do Pagar.me por um checkout 100% no Davions, com os 3 métodos de pagamento processados via API v5.

## Arquitetura

```text
[BookingWizard / SessionDetailPage]
            │
            ▼
   <PagarmeCheckoutModal>      ◄── novo componente
   ├── Tab PIX     → QR Code + copia-e-cola + polling
   ├── Tab Cartão  → form com tokenização client-side
   └── Tab Boleto  → linha digitável + PDF
            │
            ▼
   Edge functions (novas)
   ├── pagarme-create-pix-order
   ├── pagarme-create-card-order
   ├── pagarme-create-boleto-order
   └── pagarme-check-order-status   (polling do PIX)
```

A função antiga `create-pagarme-booking-checkout` (hosted checkout) continua existindo como fallback — mas o roteamento BR em `create-session-checkout` passa a abrir o modal transparente em vez de retornar uma `url`.

## Mudanças

### 1. Frontend — novo modal
- `src/components/booking/PagarmeCheckoutModal.tsx` (novo)
  - Tabs: PIX (default) · Cartão · Boleto
  - Resumo do pedido no topo (sessão, add-ons, taxa, total/sinal)
  - i18n EN/PT-BR/ES
- `src/components/booking/PagarmePixTab.tsx`
  - Chama `pagarme-create-pix-order`
  - Mostra QR code (img base64 retornada) + botão "Copiar código"
  - Timer de expiração (1h)
  - Polling a cada 4s via `pagarme-check-order-status` até `paid`
  - Em sucesso: redireciona para `/booking-success?...`
- `src/components/booking/PagarmeCardTab.tsx`
  - Form: número, nome, validade (MM/AA), CVV, parcelas (1-12), CPF do titular
  - Tokenização via `https://api.pagar.me/core/v5/tokens?appId=PAGARME_PUBLIC_KEY` direto do browser (cartão **não** passa pelo nosso servidor)
  - Envia apenas `card_token` para `pagarme-create-card-order`
  - Trata 3DS challenge se `next_action.redirect_to_url` vier no response
- `src/components/booking/PagarmeBoletoTab.tsx`
  - Form: CPF/CNPJ + endereço (autopreenchido se já houver)
  - Chama `pagarme-create-boleto-order`
  - Mostra linha digitável copiável + botão "Baixar PDF" + "Ver boleto"
  - CTA: "Já paguei" leva para tela de aguardo

### 2. Roteamento de checkout
- `src/lib/booking-checkout.ts` (novo helper) — abstrai a chamada
- Páginas que hoje chamam `create-session-checkout` e fazem `window.location = url`:
  - `src/pages/store/SessionDetailPage.tsx`
  - `src/pages/BookingConfirm.tsx`
  - `src/components/booking/BookingWizard.tsx` (se existir)
  - Quando o backend responder `{ provider: "pagarme_transparent", booking_id, order_payload }`, abre `<PagarmeCheckoutModal>` em vez de redirecionar
  - Stripe (não-BR) continua redirecionando como hoje

### 3. Backend — Edge Functions (novas)

Todas usam `Deno.env.get("PAGARME_API_KEY")` como Basic Auth, `esm.sh` imports, e CORS padrão do projeto.

**`pagarme-create-pix-order`**
- Input: `bookingId, sessionId, slotId, bookedDate, startTime, clientEmail, clientName, clientTaxId, selectedExtras, contractHtml, signatureData`
- Cria/atualiza `bookings` (mesma lógica do hosted checkout)
- Calcula total (sessão + extras + tax) ou sinal (deposit)
- Monta `Order` com `payments: [{ payment_method: "pix", pix: { expires_in: 3600 } }]`
- Inclui `split_rules` via `_shared/pagarme-split.ts` (igual ao atual)
- Persiste `pagarme_order_id` na booking
- Retorna `{ qr_code_url, qr_code_text, expires_at, order_id }`

**`pagarme-create-card-order`**
- Input: tudo acima + `cardToken, holderName, holderDocument, installments`
- Monta `payments: [{ payment_method: "credit_card", credit_card: { card_token, installments, statement_descriptor: "DAVIONS" } }]`
- Mesmo split_rules
- Trata response: se `status === "paid"` → confirma booking + retorna `{ status: "paid", redirect_url }`. Se `failed` → retorna mensagem do gateway. Se `authorized` ou `pending` (3DS) → retorna `{ next_action }`

**`pagarme-create-boleto-order`**
- Input: tudo + `address` (logradouro, número, bairro, CEP, cidade, UF), `clientTaxId`
- `payments: [{ payment_method: "boleto", boleto: { instructions, due_at, document_number } }]`
- Retorna `{ line, pdf_url, barcode, due_at }`

**`pagarme-check-order-status`**
- Input: `{ orderId }` (ou `bookingId`)
- Lê do Pagar.me; se `paid`, atualiza booking → `confirmed`/`paid` e marca `session_availability.is_booked`
- Retorna `{ status, paid_at }`

### 4. Webhook
- `supabase/functions/pagarme-webhook/index.ts` já existe. Garantir que processa `order.paid`, `order.payment_failed`, `charge.paid` para os 3 métodos. Adicionar handler de `charge.refused` (cartão recusado) para atualizar booking → `payment_failed`.

### 5. i18n
- `src/lib/i18n/translations.ts` — adicionar chaves: `pix`, `creditCard`, `boleto`, `cardNumber`, `expiry`, `cvv`, `installments`, `holderName`, `cpfCnpj`, `pixInstructions`, `pixWaiting`, `pixPaid`, `boletoInstructions`, `cardDeclined`, `processing`, `copyPixCode`, `copied`, `downloadBoleto`, etc. — para EN, PT-BR e ES.

### 6. Configuração
- Garantir que `PAGARME_PUBLIC_KEY` está exposto no frontend via `import.meta.env.VITE_PAGARME_PUBLIC_KEY` (build secret) — necessário para tokenização de cartão. Se ainda não estiver, peço para você adicionar.

## Ordem de implementação (1 message)

1. Edge functions: criar as 4 novas
2. Helper de roteamento + modal + 3 tabs
3. Atualizar páginas que chamam o checkout
4. Adicionar traduções
5. Testar fluxo PIX (mais simples) via curl + preview

## Detalhes técnicos relevantes

- **Sem dependência de SDK do Pagar.me** — chamamos a REST API direto (`https://api.pagar.me/core/v5/...`). Mais leve e estável que `npm:pagarme`.
- **Tokenização do cartão**: `POST https://api.pagar.me/core/v5/tokens?appId={PUBLIC_KEY}` — esse é o único request que sai do browser direto pro Pagar.me. Garante PCI SAQ-A.
- **Polling PIX**: 4s de intervalo, máximo 15min (depois mostra "Verificar manualmente" / "Já paguei"). Webhook continua sendo a fonte de verdade — polling é só pra UX.
- **Split rules**: continua usando `_shared/pagarme-split.ts`, sem mudanças.
- **Deposito (sinal)**: a mesma lógica de `deposit_enabled / deposit_amount / deposit_type` do `create-session-checkout` é replicada nas 3 edge functions novas.
- **Compat**: `create-pagarme-booking-checkout` (hosted) fica no projeto como fallback — pode ser removida em uma segunda PR depois que confirmarmos que o transparente funciona em produção.

## Riscos
- 3DS no cartão pode exigir um redirect curto (Pagar.me retorna URL pra abrir em iframe/janela). Implemento com fallback simples: redireciona a aba inteira pra URL do desafio e volta pra `/booking-success`.
- Antifraude: o Pagar.me v5 já roda regras automáticas no plano padrão; não precisamos integrar Clearsale separadamente nessa fase.
