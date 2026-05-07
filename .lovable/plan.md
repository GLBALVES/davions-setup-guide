## Problema

No edit mode, ao carregar uma sessão com `price=0`, o toggle **"Require payment at booking"** vem **desligado** (linha 374: `setRequirePayment(s.price > 0)`).

No `handleFinish` (linha 775):
```ts
const finalPrice = requirePayment ? priceInCents : 0;
```

Como o toggle está off, **o preço digitado pelo usuário é forçado a 0** ao salvar — daí a sensação de que "nada foi salvo" no Payment.

## Correção

### 1. `src/pages/dashboard/SessionForm.tsx` — `loadSession` (linha ~374)
Trocar:
```ts
setRequirePayment(s.price > 0);
```
por:
```ts
// Default to true so the price field is always honored.
// Photographer can explicitly disable for free sessions.
setRequirePayment(true);
```
Isso alinha o comportamento de edição com a criação (que já default é `true`).

### 2. `handleFinish` — gravar o preço sempre que digitado
Hoje, com o toggle off, o preço é zerado. Tornar o salvamento mais previsível:
```ts
const priceInCents = Math.round(parseFloat(price || "0") * 100);
const finalPrice = requirePayment ? priceInCents : 0;
```
Mantém o comportamento atual (toggle off = grátis), mas como o passo 1 garante que o toggle inicia ligado em edição, o preço será respeitado.

### 3. UX guard — pré-ativar o toggle quando o usuário digita um preço
No `onChange` do campo Session Price (linha ~2088):
```ts
onChange={(e) => {
  setPrice(e.target.value);
  if (parseFloat(e.target.value || "0") > 0 && !requirePayment) {
    setRequirePayment(true);
  }
}}
```
Garante que mesmo se o usuário desligar o toggle e depois digitar valor, o toggle volta a ligar — evitando voltar a perder o valor por descuido.

## Fora de escopo
- Não mexer em `tax_rate`, `deposit_*`, `allow_tip`, `balance_due_*` — esses campos já são gravados corretamente por `handleFinish`.
- Não mexer em formatação de moeda (esse é o plano anterior, separado).

## Arquivos tocados
- `src/pages/dashboard/SessionForm.tsx` (3 pontos)
