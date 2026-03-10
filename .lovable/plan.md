
## Diagnóstico

O código atual já tem o path multipart implementado, mas há um bug crítico que causa HTTP 500 em todas as requisições antes de chegar na lógica de upload:

**`getAuthFromBearer` usa `supabase.auth.getClaims(token)`** — esse método não existe no supabase-js v2. O método correto é `supabase.auth.getUser(token)`. Como `getClaims` lança uma exceção, ela é capturada pelo `catch` externo que retorna 500 imediatamente, antes de qualquer processamento do form.

Prova: os logs mostram apenas Boot/Shutdown, sem nenhuma linha de `console.error` — porque o catch atual não loga nada (`(err as Error).message` só constrói a resposta sem logar).

---

## O que será feito

**Reescrever `supabase/functions/add-photo/index.ts`** completamente, simplificando para multipart-first:

1. **Corrigir auth**: substituir `getClaims` por `getUser` no Bearer path
2. **Multipart only**: remover o path JSON/base64 — o plugin já não usa mais
3. **Validação explícita**: checar `photo`, `gallery_id`, `photographer_id` com retorno 400
4. **console.error em todos os pontos de falha**: storage upload, DB insert, auth failure, catch geral
5. **console.log no caminho feliz**: logar nome do arquivo, tamanho em bytes, photo_id retornado

```
Fluxo simplificado:
  req.formData() → extrai photo (File), gallery_id, photographer_id, photo_name
  ↓
  Valida campos (400 se ausente)
  ↓
  Auth: Bearer → getUser(token) | fallback: service role verifica photographer
  ↓
  photo.arrayBuffer() → Uint8Array → storage upload (upsert: true)
  ↓
  insert photos table → retorna photo_id
```

### Arquivo modificado
- `supabase/functions/add-photo/index.ts` — reescrita completa, ~90 linhas vs 298 atuais
