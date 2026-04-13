

## Auditoria: Por que o carrossel não gera

### Problema encontrado

O frontend chama **duas edge functions que não existem**:

1. **`generate-carousel`** — chamada em `CarrosselPage.tsx` linha 69
2. **`generate-caption`** — chamada em `CarrosselCaption.tsx` linha 31

A função `generate-creative` existe mas serve outros tipos (text, image, themes, gradient) — não tem handler para carrossel no formato esperado pelo frontend (retornar `{ titulo_serie, slides: [{ numero, tag, titulo, corpo, cta }] }`).

### Plano de correção

**1. Criar edge function `generate-carousel`**
- Recebe `{ tema, tom, nicho, quantidade, marca, cta }`
- Usa Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool calling
- Retorna `{ titulo_serie, slides: [{ numero, tag, titulo, corpo, cta }] }` — exatamente o formato que `CarrosselData` espera
- CORS headers padrão + `verify_jwt = false` no config.toml

**2. Criar edge function `generate-caption`**
- Recebe `{ tema, nicho, tom, titulo_serie }`
- Usa Lovable AI Gateway para gerar legenda de Instagram
- Retorna `{ caption: "..." }`
- CORS headers + `verify_jwt = false`

**3. Atualizar `supabase/config.toml`**
- Adicionar blocos `[functions.generate-carousel]` e `[functions.generate-caption]` com `verify_jwt = false`

### Arquivos

| Ação | Arquivo |
|------|---------|
| Criar | `supabase/functions/generate-carousel/index.ts` |
| Criar | `supabase/functions/generate-caption/index.ts` |
| Editar | `supabase/config.toml` (2 blocos) |

Nenhuma mudança no frontend — os componentes já chamam os nomes corretos.

