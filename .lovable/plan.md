

## Fix: Criar edge function `generate-background-image`

### Problema
O frontend (`CarrosselBackgroundEditor.tsx` linha 286) chama `generate-background-image`, mas essa edge function não existe no projeto. A requisição falha com "Failed to fetch".

### Solução

**1. Criar `supabase/functions/generate-background-image/index.ts`**
- Recebe `{ prompt }` no body
- Usa Lovable AI Gateway com modelo `google/gemini-3.1-flash-image-preview` (rápido + qualidade pro)
- Envia `modalities: ["image", "text"]` para obter imagem base64
- Faz upload da imagem gerada no bucket `creative-assets` do Storage
- Retorna `{ imageUrl: "<public_url>" }` — formato esperado pelo frontend (linha 291)
- CORS headers padrão

**2. Atualizar `supabase/config.toml`**
- Adicionar `[functions.generate-background-image]` com `verify_jwt = false`

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/generate-background-image/index.ts` |
| Editar | `supabase/config.toml` |

Nenhuma mudança no frontend necessária.

