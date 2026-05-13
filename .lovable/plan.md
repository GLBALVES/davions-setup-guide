# Plano: Pagar.me (BR) + Stripe (US/MX) com Split — 100% Whitelabel

## Visão geral

Roteamento de gateway por país do fotógrafo (`photographers.business_country`):

| Fluxo | EUA / México | Brasil |
|---|---|---|
| Assinatura do app pelo fotógrafo | Stripe (sem mudança) | Stripe (sem mudança) |
| Pagamentos de clientes finais (booking, depósito, balance, galeria) | Stripe Connect (sem mudança) | **Pagar.me API v5** com split |
| Comissão Davions | `application_fee` (já existe) | Split rule (recipient master) |

A marca **Pagar.me não aparece em nenhuma tela** — nem para o fotógrafo (KYC embutido), nem para o cliente final (checkout hospedado por nós, tokenização via SDK JS).

## Whitelabel — como será percebido

**Fotógrafo (dashboard Davions):**
- Card "Conta de Recebimento Davions" (não menciona Pagar.me).
- Wizard KYC embutido: CPF/CNPJ, dados bancários, endereço, sócios — todos os campos renderizados na nossa UI, enviados via API.
- Saldo, extratos, antecipação e transferências em telas nossas, consumindo `GET /recipients/:id/balance` e similares.
- Termos: "Ao conectar, concorda com os Termos da Davions e do nosso processador de pagamentos" (link discreto para T&C do Pagar.me — exigência regulatória).

**Cliente final (checkout):**
- Página de pagamento renderizada na Davions, com a marca do estúdio do fotógrafo.
- PIX: QR + copia-e-cola gerados via API, exibidos em tela nossa.
- Cartão: tokenização client-side via `pagarme-js` SDK (PCI scope SAQ A — nada sensível toca nosso servidor).
- Boleto: PDF baixável com layout nosso.
- Descritor da fatura no cartão: "DAVIONS*<estúdio>" (até 22 chars).
- E-mails transacionais saem pelo Brevo (já configurado), não pelo Pagar.me.

## Schema do banco (migration)

```sql
ALTER TABLE photographers
  ADD COLUMN pagarme_recipient_id text,
  ADD COLUMN pagarme_connected_at timestamptz,
  ADD COLUMN pagarme_kyc_status text;  -- 'pending' | 'active' | 'refused'

ALTER TABLE bookings
  ADD COLUMN payment_provider text DEFAULT 'stripe',  -- 'stripe' | 'pagarme'
  ADD COLUMN pagarme_order_id text,
  ADD COLUMN pagarme_charge_id text;

ALTER TABLE galleries  -- ou gallery_orders se existir
  ADD COLUMN payment_provider text DEFAULT 'stripe';

CREATE TABLE app_payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pagarme_master_recipient_id text NOT NULL,
  davions_commission_percent numeric(5,2) NOT NULL DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);
```

Filtrar `pagarme_*` nos upserts de `photographers` (padrão de `mem://architecture/database-schema-constraints`).

## Edge functions novas

| Função | Responsabilidade |
|---|---|
| `pagarme-create-recipient` | Cria Recipient via API (KYC embutido, dados do wizard) |
| `pagarme-recipient-status` | Polling de aprovação KYC + saldo |
| `pagarme-create-order` | Cria Order com `split_rules` (booking, balance, galeria) |
| `pagarme-confirm-order` | Verifica status pós-pagamento (substitui `confirm-booking` quando provider=pagarme) |
| `pagarme-webhook` | Recebe `order.paid`, `charge.paid`, `charge.refunded`, `chargeback.opened` — espelha lógica do `session-booking-webhook` |
| `pagarme-transfer-balance` | Solicita transferência manual de saldo do recipient para conta bancária do fotógrafo |

## Edge functions existentes a ajustar

- `create-booking`, `create-balance-payment-link`, `create-gallery-checkout`: detectar `business_country` do fotógrafo → roteia para Stripe (atual) ou nova `pagarme-create-order`.
- `confirm-booking`: aceitar `provider` e despachar.

## Frontend

- **Dashboard → Conexão de Pagamentos**: componente único; renderiza wizard Stripe Connect (US/MX) ou wizard Pagar.me embutido (BR), baseado no país.
- **Wizard KYC BR** (etapas): tipo de pessoa → dados pessoais/empresariais → endereço → conta bancária → revisão → submit. Todos os passos são UI nossa, com estilo "luxury minimal".
- **Checkout do cliente (BR)**: nova página/componente `PagarmeCheckout` com tabs PIX / Cartão / Boleto, integrando `pagarme-js` SDK para tokenização de cartão.
- **Painel Financeiro**: novo card "Saldo a Receber" e "Próximos Repasses" via `pagarme-recipient-status` para fotógrafos BR.
- **Admin → Settings**: tela para configurar `davions_commission_percent` e ver o `master_recipient_id`.

## Split — modelo de comissão

Em cada Order BR:
- `split_rules`:
  - Master Davions: `percentage = davions_commission_percent`, `charge_processing_fee = true`, `liable = false`
  - Fotógrafo: `percentage = 100 - davions_commission_percent`, `liable = true`
- Davions arca com a taxa de processamento Pagar.me (sai da nossa parte).
- Chargeback do valor do produto fica com o fotógrafo (`liable=true`).

## Secrets

Pedir ao usuário via `add_secret`:
- `PAGARME_API_KEY` — secret key (sk) da conta master Davions
- `PAGARME_PUBLIC_KEY` — public key (pk) usada no SDK JS do checkout
- `PAGARME_WEBHOOK_SECRET` — HMAC para validar webhooks
- `PAGARME_MASTER_RECIPIENT_ID` — recipient da Davions que recebe a comissão

## i18n

Strings novas em PT-BR, EN e ES (wizard KYC, checkout, mensagens de erro Pagar.me traduzidas).

## Fora do escopo (sugestões futuras)

- Migração ativa de fotógrafos BR já no Stripe Connect → Pagar.me (comunicação + reconexão manual).
- Antecipação de recebíveis automática.
- Integração com NFE.io / Enotas para emissão de notas fiscais.
- Pagamentos Pagar.me para AR/MX (Pagar.me só opera BR).

## Confirmar antes de implementar

1. **Comissão Davions BR**: percentual fixo (sugestão: 5% como já é no Stripe) ou variar por plano (Starter 5% / Pro 3% / Studio 1% como hoje)?
2. **Métodos de pagamento BR**: habilitar PIX + Cartão + Boleto, ou apenas PIX + Cartão?
3. **Parcelamento no cartão**: até quantas vezes? Com ou sem juros ao cliente?
4. **Fotógrafos BR já conectados ao Stripe Connect**: forçar migração para Pagar.me ou permitir manter Stripe até decisão?
