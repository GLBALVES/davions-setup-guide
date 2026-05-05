## Diagnóstico

Comparando os dois lados:

**Editor (`contracts.body` salvo no DB — fonte da verdade):**
```
Session Type:
Session Date:        ← (sem chip nenhum)
Session Time:
Session Duration:
```
O usuário **removeu** os chips dessas linhas e salvou. O DB confirma: `Session Date:</strong>&nbsp;<br>` (sem `[[session_date]]`, sem chip).

**Renderizado para o cliente (image-162):**
```
Session Date: Thursday, May 14   ← valor aparece "do nada"
```

### Causa raiz

A página pública (`SessionDetailPage.tsx`) e o `BookingConfirm.tsx` usam **dois caminhos** para obter o HTML do contrato:

1. `sessions.contract_text` — **snapshot antigo, congelado** quando a sessão foi criada. Ainda contém `[[session_date]]` próximo a "Session Date:".
2. `contracts.body` — versão atual do template (fresca).

No `useMemo` do `resolvedContractHtml` (linha 666–683 do `SessionDetailPage.tsx`), a resolução começa a partir de `session.contract_text`. Esse valor só é substituído pela versão fresca dentro do `handleEnterReview`, **depois** que o usuário clica para avançar até a etapa de revisão. Antes disso (e em qualquer renderização que não passe por esse handler — ex.: refresh, navegação direta), o HTML usado é o snapshot legado, que ainda contém o token `[[session_date]]` removido pelo fotógrafo.

Resultado: o cliente vê um campo preenchido (`Session Date: Thursday, May 14`) que **não existe mais** no contrato editado — exatamente o oposto do que aconteceu antes (token órfão renderizado como `{{null}}`), mas o mesmo bug de fundo: **estamos lendo um cache estagnado em `sessions.contract_text`**.

O mesmo padrão existe no `BookingConfirm.tsx` (linhas 247–253) e no edge function `get-booking-public` (sobrescreve `session.contract_text` apenas se `contract_id` existir, mas o cliente ainda pode usar o `contract_text` original em alguns trechos).

## Correção

Tratar **`contracts.body` como única fonte da verdade** sempre que o `contract_id` existir, em todos os pontos de leitura — nunca o snapshot.

### 1. `src/pages/store/SessionDetailPage.tsx`
- No `useEffect` de carga (linha 358–365), já busca `contracts.body` se `contract_id` existir → manter.
- **Sempre** sobrescrever `s.contract_text = contractTemplate.body` quando `contract_id` está presente, mesmo se `body` vier vazio (atualmente só sobrescreve se `body` truthy — manter assim já está ok).
- Mover a lógica de fetch para fora do `handleEnterReview` e re-buscar o `contracts.body` toda vez que o usuário entra na etapa "review" (já faz), **e também** invalidar o cache local: garantir que o `useMemo` recompute usando o body fresco. Atualmente está correto, mas adicionar dependência explícita.
- No JSX (linha 1556) onde renderiza, usar **somente** `resolvedContractHtml` (que já parte do body fresco) e não `session.contract_text` cru.

### 2. `src/pages/BookingConfirm.tsx`
- Linhas 247–253: já refaz fetch do `contracts.body`. Garantir que renderiza `resolvedContractHtml` e nunca o `session.contract_text` como fallback (linhas 1012, 1046 — remover `|| session.contract_text`).

### 3. `supabase/functions/get-booking-public/index.ts`
- Já sobrescreve `session.contract_text` com `contracts.body` se `contract_id` presente. Manter.

### 4. (Opcional, mas recomendado) Backfill
- Migration única para sincronizar `sessions.contract_text` com o `contracts.body` atual em todas as sessões com `contract_id` definido — evita confusão futura caso outro código leia o snapshot.

```sql
UPDATE sessions s
SET contract_text = c.body
FROM contracts c
WHERE s.contract_id = c.id
  AND s.contract_text IS DISTINCT FROM c.body;
```

## Resumo do que muda

- `SessionDetailPage.tsx`: renderizar apenas `resolvedContractHtml`, sem fallback para snapshot.
- `BookingConfirm.tsx`: idem, remover `|| session.contract_text` dos dois `dangerouslySetInnerHTML`.
- Migration de backfill para zerar o snapshot estagnado de todas as sessões existentes.

Após isso, o que o fotógrafo vê no editor = o que o cliente vê no checkout, sempre.
