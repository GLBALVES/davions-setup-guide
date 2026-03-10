
## Problemas identificados

### Problema 1 — `add-photo` Edge Function: BootFailure (crítico)
O log mostra que a função falha ao iniciar porque a importação `decode` de `https://deno.land/std@0.224.0/encoding/base64.ts` não existe mais nessa versão. Mas há um segundo problema: o plugin atualizado **não usa mais base64**. Ele passou a usar `LrHttp.postMultipart` (multipart/form-data binário). A edge function atual ainda espera JSON com base64, o que é incompatível.

**Solução**: Reescrever `add-photo/index.ts` para:
1. Remover o import quebrado de `decode`
2. Detectar o `Content-Type` da requisição e tratar `multipart/form-data` (usando `req.formData()`)
3. Extrair o arquivo binário diretamente como `ArrayBuffer` para upload no storage

### Problema 2 — `DashboardHeader` e `Settings`: query em coluna inexistente
Todas as requisições para `photographers?select=business_name,full_name` retornam `400 - column photographers.business_name does not exist`. A coluna `business_name` (e outras colunas `business_*`) não foram criadas no banco, mas o código as utiliza.

**Solução**: Criar uma migração para adicionar as colunas `business_name`, `business_phone`, `business_address`, `business_city`, `business_country`, `business_currency`, `business_tax_id` na tabela `photographers`.

---

## Plano de implementação

### 1. Migração de banco — adicionar colunas business à tabela photographers
```sql
ALTER TABLE public.photographers
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS business_phone text,
  ADD COLUMN IF NOT EXISTS business_address text,
  ADD COLUMN IF NOT EXISTS business_city text,
  ADD COLUMN IF NOT EXISTS business_country text,
  ADD COLUMN IF NOT EXISTS business_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS business_tax_id text;
```

### 2. Reescrever `supabase/functions/add-photo/index.ts`
- Remover `import { decode } from "https://deno.land/std@0.224.0/encoding/base64.ts"`
- Adaptar autenticação para funcionar com multipart (não pode clonar e fazer `.json()` em multipart)
- Ler `req.formData()` para extrair `gallery_id`, `photographer_id`, `photo_name` e o arquivo binário (`photo`)
- Manter fallback: se `Content-Type` for JSON, aceitar base64 (retrocompatibilidade)
- Upload do binário diretamente com `Uint8Array` via service role client

```
multipart/form-data flow:
  formData = await req.formData()
  gallery_id  = formData.get("gallery_id")
  photo_name  = formData.get("photo_name")
  file        = formData.get("photo") as File
  bytes       = await file.arrayBuffer()
  → upload bytes to storage
  → insert photo record
```

### Autenticação com multipart
Como multipart não tem body JSON, a auth via `photographer_id` no body precisará vir do form field, não de `req.clone().json()`. A lógica será:
- Primeiro tentar Bearer token (header — funciona igual)
- Se falhar, tentar `photographer_id` do form field

### Arquivos a modificar
- `supabase/functions/add-photo/index.ts` — reescrever para multipart
- Migração DB — adicionar colunas business
