
## Diagnóstico

### Causa-raiz identificada

Os logs mostram exatamente o que ocorreu:

```
ERROR delete-photo error: Error: JWT has expired
  at $.getClaims (...)
```

O plugin do Lightroom enviou o request com um **Bearer token JWT expirado**. O código da função captura esse erro corretamente, mas a lógica de fallback para `photographer_id` nunca é atingida porque:

1. O plugin enviou apenas `Authorization: Bearer <token-expirado>` — sem `photographer_id` no body
2. `getClaims()` lança uma exceção (`JWT has expired`) em vez de retornar um erro estruturado
3. O `catch` global no topo da função captura a exceção e retorna HTTP 500 diretamente, pulando o fallback de `photographer_id`

**Prova**: a foto `326216a6-4302-4be0-b5b0-37821a780b4d` ainda existe no banco com `storage_path` intacto.

### Fluxo atual (com bug)
```text
Request com JWT expirado
  → getClaims() lança exceção
    → catch global captura
      → retorna 500 imediatamente
        → foto NÃO é deletada
```

### Fluxo correto esperado
```text
Request com JWT expirado
  → getClaims() retorna erro (não lança)
    → verified = false
      → tenta fallback por photographer_id
        → photographer_id undefined → Unauthorized (401)
          OU photographer_id presente → delete procede
```

---

## Solução

Envolver o `getClaims()` em um `try/catch` próprio, para que exceções como `JWT has expired` sejam tratadas localmente e não escapem para o `catch` global.

**Mudança cirúrgica em `supabase/functions/delete-photo/index.ts`:**

```typescript
// ANTES (bug): exceção de JWT expirado vaza para o catch global
const { data: claims, error: claimsError } = await anonClient.auth.getClaims(token);

// DEPOIS (fix): exceção capturada localmente, fallback continua funcionando
try {
  const { data: claims, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError) {
    console.error("Bearer auth error:", claimsError.message);
  } else if (claims?.claims?.sub) {
    console.log("Authenticated via Bearer token, userId:", claims.claims.sub);
    verified = true;
  }
} catch (jwtErr) {
  console.warn("JWT verification failed (possibly expired):", String(jwtErr));
  // verified permanece false → fallback de photographer_id será tentado
}
```

O mesmo padrão já existe na função `delete-gallery` e deve ser replicado aqui.

---

## Arquivos a editar

- `supabase/functions/delete-photo/index.ts` — envolver `getClaims()` em try/catch local

Após o fix, a função vai:
1. Capturar JWT expirado sem travar
2. Cair no fallback de `photographer_id` (se enviado pelo plugin)
3. Se o plugin não envia `photographer_id`, retornar 401 limpo — o plugin deve ser configurado para sempre enviar `photographer_id` no body como fallback

> **Nota**: A foto `326216a6-4302-4be0-b5b0-37821a780b4d` ainda existe no banco e pode ser deletada manualmente ou pelo próprio Lightroom após o fix ser aplicado.
