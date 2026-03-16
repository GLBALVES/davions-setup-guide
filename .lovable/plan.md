
## Salvar STRIPE_WEBHOOK_SECRET

O usuário forneceu o signing secret do webhook: `whsec_vhZdyDzlP95VuWh3TuAtfcBntvlQVISZ`

### O que precisa ser feito

1. **Salvar o secret** `STRIPE_WEBHOOK_SECRET` com o valor fornecido usando a ferramenta `add_secret`
2. **Verificar** que a Edge Function `session-booking-webhook` já usa `Deno.env.get("STRIPE_WEBHOOK_SECRET")` para validar as assinaturas — já está implementado conforme o arquivo existente

### Estado atual
- `session-booking-webhook/index.ts` já tem o código correto para validar com o secret
- `STRIPE_WEBHOOK_SECRET` ainda **não está** na lista de secrets do projeto
- Com o secret salvo, o webhook passará a verificar a assinatura criptográfica do Stripe, rejeitando requests inválidos

### Ação única
Salvar o secret `STRIPE_WEBHOOK_SECRET = whsec_vhZdyDzlP95VuWh3TuAtfcBntvlQVISZ` nas configurações do projeto.

Nenhuma alteração de código é necessária — tudo já está implementado.
