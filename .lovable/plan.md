
## Diagnóstico: Loading infinito no /admin

### Causa raiz identificada

`AdminLayout.tsx` tem dois bugs que causam loading eterno:

1. **Sem tratamento de erro na query `user_roles`** — se a query falhar (rede, RLS, timeout), o `.then()` ainda é chamado mas o `.catch()` não existe. Na verdade, com a API do Supabase, erros retornam como `{ data: null, error: ... }` dentro do `.then()`, não como rejeição de Promise. Porém o código só chama `setChecking(false)` quando `data` existe (admin confirmado) ou navega para `/dashboard` quando `data` é null. Se a query retornar `{ data: null }` por erro de RLS ou timeout, ele navega para `/dashboard` — isso pode ser OK mas não é o problema atual.

2. **`checking` começa como `true` e nunca é resetado entre re-renders** — quando `loading` ainda é `true` no mount, o effect retorna cedo (`if (loading) return`). Quando `loading` muda para `false`, o effect dispara novamente — mas se o user NÃO for admin, ele navega. Se a Promise da query for lenta ou falhar silenciosamente, `checking` permanece `true`.

3. **A query usa `(supabase as any)`** — isso mascara erros TypeScript e sugere que a tipagem da tabela `user_roles` pode estar causando problema.

### Fix

**`src/components/admin/AdminLayout.tsx`**:
- Adicionar `.catch(() => navigate("/dashboard"))` após o `.then()` para garantir que qualquer erro de rede/Promise desbloqueie o loading
- Adicionar um timeout de segurança de 5s para o `checking` — se a query de `user_roles` não resolver em 5s, redirecionar para `/dashboard`
- O resultado: loading nunca fica infinito

```typescript
// Antes (sem .catch):
(supabase as any)
  .from("user_roles")
  ...
  .then(({ data }) => {
    if (!data) { navigate("/dashboard"); return; }
    setChecking(false);
  });

// Depois (com .catch + timeout):
const checkTimer = setTimeout(() => navigate("/dashboard"), 5000);

(supabase as any)
  .from("user_roles")
  ...
  .then(({ data }: { data: { role: string } | null }) => {
    clearTimeout(checkTimer);
    if (!data) { navigate("/dashboard"); return; }
    setChecking(false);
  })
  .catch(() => {
    clearTimeout(checkTimer);
    navigate("/dashboard");
  });
```

### Arquivo alterado
- `src/components/admin/AdminLayout.tsx` — adicionar `.catch()` e timeout de segurança de 5s na verificação de admin role
