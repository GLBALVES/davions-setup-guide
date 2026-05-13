# Plano: Painel Admin de Pagamentos (Pagar.me + Stripe)

Adicionar uma nova seção no painel administrativo (`/admin/payments`) para centralizar a configuração dos provedores de pagamento, sem precisar mexer em secrets via Lovable Cloud diretamente.

## Nova rota

- `/admin/payments` → `src/pages/admin/AdminPayments.tsx`
- Adicionar item "Payments" em `AdminSidebar.tsx` (ícone `CreditCard`), entre "Email" e "Approvals".

## Estrutura da página

Tabs no topo: **Pagar.me (Brasil)** | **Stripe (Global)** | **Comissão & Split**

### Tab 1 — Pagar.me (Brasil)
Lê/escreve em `app_payment_settings` (única linha).

- Card "Conta Master Davions"
  - Input: **Master Recipient ID** (`pagarme_master_recipient_id`) — recipient da Davions que recebe a comissão.
  - Botão "Testar conexão" → chama edge function `pagarme-recipient-status` com o ID, mostra status (active/pending/refused) e saldo.
- Card "Credenciais de API" (somente leitura, mostra status dos secrets)
  - `PAGARME_API_KEY` — Configurada / Não configurada
  - `PAGARME_PUBLIC_KEY` — idem
  - `PAGARME_WEBHOOK_SECRET` — idem
  - Botão "Atualizar credenciais" abre instruções (não dá pra editar secret pelo painel — apenas via Lovable Cloud secrets manager).
  - Edge function `admin-check-pagarme-secrets` retorna apenas booleanos (`hasApiKey`, `hasPublicKey`, `hasWebhookSecret`), nunca os valores.
- Card "Webhook URL" (read-only, copiável)
  - Mostra `https://<project>.functions.supabase.co/pagarme-webhook` para o admin colar no painel do Pagar.me.

### Tab 2 — Stripe (Global)
- Card "Credenciais Stripe" — mesmo padrão de status (somente flags) para `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CLIENT_ID`, `STRIPE_PUBLISHABLE_KEY`.
- Card "Stripe Connect" — link para `https://dashboard.stripe.com/connect`.
- Card "Webhook URL" — `https://<project>.functions.supabase.co/session-booking-webhook`.

### Tab 3 — Comissão & Split
- Slider/input **Comissão Davions BR** (`davions_commission_percent`) — padrão 5%, range 0–30%.
- Toggle "Davions arca com taxa de processamento Pagar.me" (`charge_processing_fee` no split — padrão ligado).
- Card informativo: "Esta comissão se aplica a todos os pagamentos de clientes feitos por fotógrafos brasileiros via Pagar.me."
- Para US/MX (Stripe Connect), comissão continua sendo o `application_fee` configurado por plano (link para a tela de planos).

Botão "Salvar" no rodapé (sticky) — atualiza `app_payment_settings` via supabase client (RLS já restringe a admins).

## Edge functions novas

- `admin-check-pagarme-secrets` — retorna `{ hasApiKey, hasPublicKey, hasWebhookSecret, hasMasterRecipient }`. Valida `has_role(auth.uid(), 'admin')` antes de responder.
- `admin-test-pagarme-recipient` — recebe `{ recipientId }`, chama `GET /recipients/:id` e `GET /recipients/:id/balance`. Retorna status e saldo formatado. Também restrita a admin.

## Acesso

Restrito por `has_role(auth.uid(), 'admin')` — mesma proteção do `AdminLayout`.

## i18n

Strings novas em PT-BR / EN / ES (cards, botões, mensagens de teste de conexão).

## Fora do escopo

- Editar valores de secrets pelo painel (continua via Lovable Cloud — explicação na UI).
- Histórico de transações Pagar.me (próxima iteração).
- Onboarding do recipient master (admin cria manualmente no painel Pagar.me uma vez).
