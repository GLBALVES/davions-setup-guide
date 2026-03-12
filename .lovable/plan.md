
## Análise do fluxo atual

**Hoje:**
1. Fotógrafo acessa Settings → Payments e clica "Activate payment"
2. `create-stripe-connect-account` cria a conta Custom no Stripe imediatamente
3. O onboarding embedded é exibido para preenchimento de dados bancários
4. Ao chegar no checkout do cliente, a conta já existe em `photographers.stripe_account_id`

**Problema levantado:** Fotógrafos que nunca recebem um agendamento têm uma conta Connect criada à toa.

**Esclarecimento importante sobre a cobrança do Stripe:**
O Stripe cobra **$2/mês por conta ativa**, onde "ativa" = conta que processou pelo menos um pagamento naquele mês. Contas criadas mas sem nenhuma transação **não são cobradas**. Portanto, criar a conta antecipadamente não tem custo direto enquanto não houver pagamento.

**Porém**, a proposta de adiar a criação até o primeiro checkout tem **outras vantagens legítimas**:
- Banco de dados mais limpo (sem contas Stripe abandonadas)
- Fotógrafo não precisa completar o onboarding antes de publicar uma sessão
- Melhor UX: o onboarding só aparece quando há de fato uma intenção de receber dinheiro

---

## Plano: Lazy Stripe Connect — criar conta no primeiro checkout

### Estratégia

Quando o cliente confirma o booking e o checkout tenta ser criado (`create-session-checkout`), se `stripe_account_id` for null:

1. A edge function cria a conta Connect automaticamente (mesmo código do `create-stripe-connect-account`)
2. Salva o `stripe_account_id` no banco
3. **Porém:** sem dados bancários, a conta não pode receber payouts — isso é correto e esperado. O fotógrafo completa o onboarding depois, pela tela de Settings/Billing.

O cliente **paga normalmente** via Stripe Checkout — o dinheiro fica na conta Connect (disponível depois do onboarding) e o payout só ocorre quando o fotógrafo configurar a conta bancária.

Isso é o comportamento padrão do Stripe: **o dinheiro é capturado e fica em custódia até o onboarding ser completado**.

### Mudanças necessárias

**1. `supabase/functions/create-session-checkout/index.ts`**

Adicionar lógica logo após buscar `photoData`:

```text
Se stripeAccountId é null:
  → Criar conta Connect via stripe.accounts.create()
  → Persistir stripe_account_id no banco (photographers)
  → Usar a nova conta para o checkout
  → Retornar flag "onboarding_required: true" junto com a checkout URL
```

**2. `src/pages/store/SessionDetailPage.tsx`**

Após o redirect do checkout bem-sucedido, verificar se `onboarding_required` foi retornado. Neste caso, não há mudança necessária do lado do cliente — o comportamento é transparente para o cliente final.

**3. `src/pages/dashboard/Billing.tsx` e `Settings.tsx`**

Na seção de Payments, quando `stripe_account_id` existe mas o onboarding não foi completado (detectado pela ausência de `stripe_connected_at`), exibir um banner de aviso:

```text
┌────────────────────────────────────────────────────────────┐
│ ⚠  Payment account created — complete setup to receive     │
│    payouts. Funds are being held until onboarding is done. │
│                          [ Complete Setup → ]              │
└────────────────────────────────────────────────────────────┘
```

### O que NÃO muda

- O fotógrafo ainda pode ativar manualmente via Settings → Payments antes de receber qualquer agendamento (fluxo atual preservado)
- Se `stripe_account_id` já existe, o checkout funciona exatamente como hoje
- Nenhuma mudança no webhook `session-booking-webhook`

### Resumo visual do novo fluxo

```text
Cliente acessa sessão → seleciona slot → preenche dados → clica "Pay"
         │
         ▼
  create-session-checkout
         │
         ├── stripe_account_id EXISTS?  → checkout normal (sem mudança)
         │
         └── stripe_account_id NULL?
                  │
                  ▼
           Cria conta Connect automaticamente
           Salva no banco
           Cria checkout na nova conta
                  │
                  ▼
           Cliente paga → webhook confirma booking
           Dinheiro fica em custódia na conta Connect
                  │
                  ▼
           Fotógrafo vê banner "Complete setup" no Billing/Settings
           Clica "Complete Setup" → onboarding embedded
           Após onboarding: payouts liberados automaticamente pelo Stripe
```

### Arquivos a modificar

1. `supabase/functions/create-session-checkout/index.ts` — lógica de auto-criação da conta Connect
2. `src/pages/dashboard/Settings.tsx` — banner de onboarding pendente (quando há conta mas sem `stripe_connected_at`)
3. `src/pages/dashboard/Billing.tsx` — mesmo banner na seção de balanço
