
## Análise da situação

O usuário quer preços regionais reais: detecção por IP + price_ids separados no Stripe por moeda. Isso é uma feature completa com 3 camadas:

1. **Detecção de região** — IP → país → moeda
2. **Exibição visual** — preço e símbolo de moeda corretos na landing
3. **Checkout real** — price_id correto por moeda enviado ao Stripe

### Estrutura de preços proposta

| Região | Moeda | Starter | Pro | Studio |
|---|---|---|---|---|
| US/Global | USD $ | $29 | $69 | $129 |
| Brasil | BRL R$ | R$59 | R$149 | R$279 |
| LatAm (ES) | MXN $ ou USD | $15 | $35 | $65 |

> Os valores reais em BRL/MXN precisam ser definidos pelo usuário. O plano usa placeholders que podem ser ajustados.

---

## Plano de implementação

### Passo 1 — Criar novos price_ids no Stripe
Usar a ferramenta Stripe para criar produtos/preços em BRL e MXN para os 3 planos (Starter, Pro, Studio), totalizando 6 novos price_ids (3 planos × 2 moedas).

### Passo 2 — Criar edge function `detect-region`
Nova edge function leve que recebe o IP do header `x-forwarded-for` e chama a API pública de geolocalização (`ip-api.com` — gratuita, sem chave) para retornar:
```json
{ "country": "BR", "currency": "BRL", "region": "pt" }
```

### Passo 3 — Criar `RegionContext` no frontend
- `src/contexts/RegionContext.tsx` — chama `detect-region` uma vez no mount, armazena `{ currency, countryCode, priceMap }` em state + sessionStorage (cache de 30 min)
- `priceMap` mapeia cada plano ao `price_id` e valor numérico correto para a moeda detectada

### Passo 4 — Atualizar `Index.tsx` (landing page)
- Consumir `useRegion()` para mostrar o preço e símbolo de moeda corretos dinamicamente
- Substituir as chaves estáticas `l.plan1Price` por valores vindos do `RegionContext`
- Mostrar um badge discreto "Prices in BRL · Brazil" / "Preços em R$ · Brasil"

### Passo 5 — Atualizar `Billing.tsx` + `create-subscription-checkout`
- `PLANS` array passa a ter `price_id_usd`, `price_id_brl`, `price_id_mxn`
- A edge function recebe `price_id` já resolvido pelo frontend com base na moeda do usuário
- A validação `VALID_PRICE_IDS` é expandida para incluir todos os price_ids regionais

---

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| (Stripe) | 6 novos prices criados via API (BRL × 3 planos + MXN × 3 planos) |
| `src/contexts/RegionContext.tsx` | Novo — detecção de região + cache |
| `src/main.tsx` | Envolver app com `<RegionProvider>` |
| `src/pages/Index.tsx` | Usar `useRegion()` para preços dinâmicos |
| `src/pages/dashboard/Billing.tsx` | PLANS com price_ids por moeda, usar região detectada |
| `supabase/functions/detect-region/index.ts` | Nova edge function de geolocalização |
| `supabase/functions/create-subscription-checkout/index.ts` | VALID_PRICE_IDS expandido |

---

## Antes de implementar: confirme os valores

Precisamos definir os preços regionais. Aqui está a proposta:

| Plano | USD | BRL | MXN |
|---|---|---|---|
| Starter | $29 | R$59 | $15 |
| Pro | $69 | R$149 | $35 |
| Studio | $129 | R$279 | $65 |

Posso prosseguir com esses valores ou você quer ajustá-los antes de criar os price_ids no Stripe?
