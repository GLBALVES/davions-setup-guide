

## Corrigir erros de build + Verificar responsividade dos botões

### Problema atual
A página não renderiza devido a erros de compilação em 3 frentes:

1. **Tabelas do carrossel não estão nos tipos gerados** (`carousel_historico`, `carousel_meta_config`, `carousel_image_library`) — os componentes tentam usar `supabase.from("carousel_historico")` mas o TypeScript rejeita porque a tabela não existe em `types.ts`.

2. **Import `npm:` em `confirm-booking/index.ts`** — mesmo problema que foi corrigido em `check-subscription` mas existe em outra function.

### Plano

**1. Criar migração para as 3 tabelas do carrossel** (se não existirem no banco):
- `carousel_historico` — histórico de carrosseis gerados
- `carousel_meta_config` — config Meta/Instagram por fotógrafo  
- `carousel_image_library` — biblioteca de imagens para backgrounds
- Com RLS policies filtrando por `photographer_id`
- Isso vai regenerar `types.ts` automaticamente

**2. Corrigir import em `confirm-booking/index.ts`** — trocar `npm:@supabase/supabase-js@2.57.2` por `https://esm.sh/@supabase/supabase-js@2.49.1`

**3. Após build funcionar** — verificar responsividade dos botões da CreativeIndexPage em mobile (320px) e tablet (768px), propondo ajustes se necessário.

### Arquivos
- Nova migração SQL (3 tabelas + RLS)
- `supabase/functions/confirm-booking/index.ts` (fix import)

