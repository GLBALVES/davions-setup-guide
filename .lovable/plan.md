
## Análise

`delete-gallery/index.ts` tem o **mesmo bug** do `delete-photo` original: o `getClaims()` na linha 21 não está dentro de um `try/catch` local.

```typescript
// Linha 21 — sem proteção:
const { data: claims, error } = await supabase.auth.getClaims(token);
```

Quando o JWT está expirado → `getClaims()` lança exceção → escapa para o `catch` global (linha 97) → retorna 500 → fallback de `photographer_id` nunca é tentado.

## Mudança cirúrgica

Só a função `getAuthenticatedClient`, linhas 16-25: envolver o `getClaims()` em `try/catch` local, idêntico ao padrão já aplicado no `delete-photo`.

**Antes (linha 21):**
```typescript
const { data: claims, error } = await supabase.auth.getClaims(token);
if (!error && claims?.claims) {
  return { supabase, userId: claims.claims.sub as string };
}
```

**Depois:**
```typescript
try {
  const { data: claims, error } = await supabase.auth.getClaims(token);
  if (!error && claims?.claims) {
    return { supabase, userId: claims.claims.sub as string };
  }
} catch (jwtErr) {
  console.warn("JWT verification failed (possibly expired), trying photographer_id fallback:", String(jwtErr));
}
```

## Arquivo a editar

- `supabase/functions/delete-gallery/index.ts` — linhas 16-25, wrap try/catch no `getClaims()`
