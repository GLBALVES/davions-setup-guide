# Painel de Saldo & Recebíveis (Pagar.me)

Hoje o fotógrafo já tem o `FinanceDashboard` (visão de bookings) e o `get-stripe-balance` (saldo Stripe Connect). Falta uma tela equivalente para o **Pagar.me**, que é o gateway usado pelos clientes BR (PIX, boleto, cartão).

## Objetivo

Criar uma página dedicada onde o fotógrafo:
1. Vê **quanto tem disponível**, **a receber** (recebíveis futuros, ex.: parcelas de cartão e D+1 do PIX) e **bloqueado**.
2. Acompanha o **histórico de transações** (PIX/boleto/cartão) com status, valor líquido, taxas e data prevista de liberação.
3. Solicita **saque (transferência para conta bancária)** do saldo disponível.
4. Consulta **histórico de saques** já realizados.

## Localização na UI

- Nova rota: `/dashboard/finance/pagarme` (ou aba dentro de `FinanceDashboard`).
- Card novo no `FinanceDashboard` chamado **"Saldo Pagar.me"** ao lado do bloco de Stripe, com link "Ver detalhes".
- Item no `DashboardSidebar` em Finance: **"Saldo Pagar.me"**.
- i18n em EN / PT-BR / ES (regra do projeto).

## Layout da página (luxury minimal, padrão do projeto)

```text
┌──────────────────────────────────────────────────────────┐
│ SALDO PAGAR.ME                                            │
│                                                           │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Disponível   │ │ A receber    │ │ Bloqueado    │        │
│ │ R$ 0.000,00  │ │ R$ 0.000,00  │ │ R$ 0.000,00  │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                           │
│ [ Solicitar saque ]   conta: Banco XX ag/cc ****          │
├──────────────────────────────────────────────────────────┤
│ Próximos recebíveis (calendário / lista por data)         │
│  14/05  R$ 320,00  cartão 2/3                             │
│  15/05  R$ 180,00  PIX                                    │
├──────────────────────────────────────────────────────────┤
│ Transações (filtros: status, método, período)             │
│  data  cliente  método  bruto  taxa  líquido  status      │
├──────────────────────────────────────────────────────────┤
│ Saques (histórico)                                        │
│  data  valor  status  conta destino                       │
└──────────────────────────────────────────────────────────┘
```

## Fluxo de saque

1. Botão "Solicitar saque" abre modal com valor (default = saldo disponível) e conta destino (a cadastrada no onboarding Pagar.me).
2. Confirma → edge function cria transferência → atualiza lista.
3. Se não houver conta bancária cadastrada, mostra CTA para completar o onboarding (`PagarmeOnboardingModal` já existe).

## Detalhes técnicos

**Edge functions novas (usando `PAGARME_API_KEY` que já existe nos secrets):**

- `pagarme-get-balance` — `GET /core/v5/recipients/{recipient_id}/balance` → retorna `available`, `waiting_funds`, `transferred`.
- `pagarme-list-transactions` — `GET /core/v5/orders` filtrando por `customer_id`/metadata do fotógrafo, ou cache local na nossa tabela `bookings` filtrando `payment_provider = 'pagarme'`.
- `pagarme-list-receivables` — `GET /core/v5/recipients/{recipient_id}/anticipation_limits` ou `/payables` para parcelas futuras.
- `pagarme-create-withdrawal` — `POST /core/v5/recipients/{recipient_id}/withdrawals` com `amount`.
- `pagarme-list-withdrawals` — `GET /core/v5/recipients/{recipient_id}/withdrawals`.

Todas: validam o usuário via JWT, lêem `photographers.pagarme_recipient_id` (já existente no onboarding) com service role e chamam a Pagar.me com o secret. CORS padrão do projeto.

**Frontend:**

- `src/pages/dashboard/FinancePagarme.tsx` — página principal.
- `src/components/dashboard/PagarmeWithdrawModal.tsx` — modal de saque.
- Reuso de `KpiCard`/estilos do `FinanceDashboard`.
- React Query com `staleTime: 30s` (regra do projeto).
- Valores em centavos, exibidos em BRL via `Intl.NumberFormat('pt-BR', { currency: 'BRL' })`.

**Sem alterações de schema** — `photographers.pagarme_recipient_id` já existe; não é preciso persistir saldo (sempre buscar ao vivo).

## Pontos a confirmar

1. Você já tem **`pagarme_recipient_id`** salvo no onboarding do fotógrafo? (vou assumir que sim — está no `PagarmeOnboardingModal`).
2. O saque deve permitir **valor parcial** ou só "sacar tudo"?
3. Quer também um **gráfico de evolução** (últimos 6 meses) como no `FinanceDashboard`, ou manter mais enxuto nesta primeira versão?
