
## Diagnóstico completo — por que o delete-photo não deletou

### O que os logs mostram

```text
2026-03-10T17:56:04Z INFO   delete-photo called with photo_id: abca2411-1a71-455f-9d4a-163a9989734b photographer_id: undefined
2026-03-10T17:56:04Z ERROR  delete-photo error: Error: JWT has expired
    at $.getClaims (index.ts:44)
2026-03-10T17:56:04Z LOG    shutdown
HTTP response: 500
```

### Causa raiz — versão antiga ainda deployada

O código corrigido foi editado no arquivo `supabase/functions/delete-photo/index.ts`, mas **não foi feito o deploy da função**. O stack trace indica `getClaims` na linha 44, que é exatamente o código pré-fix. A versão em produção ainda usa `auth.getClaims()` (API do Supabase v1) em vez de `getUser()` (v2).

### Cadeia de falhas

```text
Plugin envia DELETE com Bearer token (JWT expirado)
      ↓
delete-photo tenta auth.getClaims(token)  ← v1 API, não existe em v2
      ↓
Lança exceção "JWT has expired" (não é apenas auth inválida — o JS throw vaza para o catch)
      ↓
catch global captura o erro → retorna HTTP 500
      ↓
Foto NÃO é deletada nem do Storage, nem do banco
```

### Confirmação: foto ainda existe no banco

A foto `abca2411-1a71-455f-9d4a-163a9989734b` ainda está na tabela `photos`:
- **filename**: `ChatGPT Image 18 de ago. de 2025, 19_51_29.jpg`
- **gallery_id**: `51912a76-5e4b-4ecc-bb77-1cd9116c6f7f`
- **storage_path**: presente — arquivo também ainda existe no Storage

### Dois problemas encadeados

| # | Problema | Impacto |
|---|---|---|
| 1 | Versão antiga ainda deployada em produção (`getClaims`) | Fix anterior não entrou em vigor |
| 2 | JWT enviado pelo plugin estava expirado | Mesmo com o fix de `getUser`, a autenticação JWT falharia nessa chamada específica |

O problema 2 revela um ponto importante: o plugin do Lightroom estava enviando um token expirado. Com o código corrigido, `getUser()` retornaria um erro de auth (não um throw), e o código cairia no **fallback de `photographer_id`** — porém o plugin não enviou `photographer_id` no corpo (`photographer_id: undefined` nos logs), portanto a deleção ainda falharia com 401.

### O que precisa ser feito

1. **Deploy imediato** do `delete-photo` com o código já corrigido que está no arquivo
2. **Garantir que o plugin envie `photographer_id` no body** de toda requisição de deleção como fallback, OU que o token JWT seja válido (não expirado)

### Plano de ação

**Passo 1 — Deploy do código corrigido**
Usar `supabase--deploy_edge_functions` para fazer o deploy de `delete-photo` agora.

**Passo 2 — Validar com curl**
Usar `supabase--curl_edge_functions` para testar a função com um `photo_id` real e confirmar que retorna `{ "deleted": "..." }`.

**Passo 3 — Verificar o plugin**
O plugin precisa incluir `photographer_id` no body de toda chamada de delete como garantia de fallback, caso o JWT expire. Isso é uma mudança no lado do plugin, não no código aqui — mas vale documentar.

Devo prosseguir com o deploy e a validação via curl?
