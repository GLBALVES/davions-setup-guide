
## Diagnóstico

O loading infinito tem uma causa específica e identificada no código:

**`PublicOnlyRoute`** espera que `loading` do `AuthContext` seja `false` antes de renderizar qualquer coisa. Enquanto `loading === true`, exibe apenas `"Loading…"`.

O problema não é no AuthContext em si — ele resolve normalmente via `getSession()`. O problema está no **`RegionContext`**:

### Causa raiz

`RegionContext` chama a edge function `detect-region` ao iniciar. Se essa edge function estiver lenta ou com timeout (ip-api.com é um serviço externo com timeout de 3s), a página da landing (`Index.tsx`) **parece travar** visualmente porque:

1. `region.loading` começa como `true`
2. O `Index.tsx` usa `region.loading` para exibir `currencyBadge`
3. Mas mais grave: se a edge function `detect-region` **não estiver deployada ou retornar erro de rede**, o `RegionProvider` pode ficar em estado `loading: true` indefinidamente — o `.catch()` resolve, mas se a função não existir no projeto ainda, pode haver um erro silencioso.

Porém há um problema **mais direto** vendo o `AuthContext`:

```
setLoading(false)
```

É chamado tanto no `onAuthStateChange` **quanto** no `getSession()`. Se o banco estiver demorando ou o `supabase.auth.getSession()` nunca resolver (problema de conectividade), `loading` fica `true` e o `PublicOnlyRoute` fica preso em `"Loading…"`.

### Para `davions.com`

`davions.com` está em `EXACT_APP_HOSTNAMES`, então `isCustomDomain()` retorna `false` — o app deve mostrar a landing page normalmente. O loading que o usuário vê é o `PublicOnlyRoute` esperando o `AuthContext` resolver.

## Solução

Adicionar um **timeout de segurança** no `AuthContext`: se `getSession()` não resolver em 5 segundos, forçar `loading: false` para não bloquear a UI.

Também garantir que `RegionProvider` tenha timeout explícito (já tem `AbortSignal.timeout(3000)` na edge function, mas o `.catch()` pode não estar sendo acionado se o erro for diferente).

### O que implementar

1. **`AuthContext.tsx`** — adicionar `setTimeout` de 5s que força `setLoading(false)` caso o `getSession` nunca responda
2. **`RegionContext.tsx`** — adicionar timeout de 4s no `.then()` via `Promise.race()` para garantir que `loading` sempre resolva

### Mudanças técnicas

**`AuthContext.tsx`** — adicionar após o `useEffect`:
```typescript
// Safety timeout: se supabase não responder em 5s, libera a UI
const safetyTimer = setTimeout(() => setLoading(false), 5000);
// cancelar no cleanup e no success
```

**`RegionContext.tsx`** — envolver o `invoke` com `Promise.race`:
```typescript
const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000));
Promise.race([supabase.functions.invoke("detect-region"), timeout])
  .then(...)
  .catch(() => setRegion({ ...DEFAULT_REGION, loading: false }));
```

Isso garante que mesmo em falha total de rede, o app carrega em no máximo 5 segundos.
