

## Auditoria do Módulo Blog — Resultados e Plano de Correção

### Problema Principal: Tabelas Inexistentes

O módulo blog foi implementado no frontend referenciando **5 tabelas que não existem no banco de dados**:

| Tabela esperada | Existe? | Usada em |
|---|---|---|
| `ai_blog_config` | Nao | BlogContext, ConfigPage |
| `blogs` | Nao | GeradorPage, DashboardPage, SeoPage, PreviewPage, PublicadosPage, ManualPage, ImageModal |
| `ai_themes` | Nao | TemasPage, BancoTemasPage, GeradorPage, PreviewPage |
| `ai_blog_images` | Nao | ImageModal, PublicadosPage |
| `ai_blog_seo` | Nao | GeradorPage, SeoPage, PreviewPage, PublicadosPage, ManualPage, DashboardPage |

Existem tabelas legadas similares (`blog_posts`, `blog_themes`, `blog_settings`, `blog_categories`) mas com schemas incompativeis.

### Edge Functions Faltando

3 edge functions chamadas pelo frontend nao existem:
- `generate-themes` — chamada em TemasPage
- `generate-blog` — chamada em GeradorPage  
- `generate-blog-image` — chamada em ImageModal

### Outro Erro de Build

- `check-subscription/index.ts` usa `npm:@supabase/supabase-js@2.57.2` ao inves de `https://esm.sh/` — Deno nao resolve modulos npm sem configuracao

### Storage Bucket

O modulo usa bucket `blog-module` para imagens — precisa ser criado.

### Delete Account

A edge function `delete-account` lista tabelas legadas (`blog_themes`, `blog_posts`, `blog_settings`) mas nao lista as novas tabelas do modulo (`blogs`, `ai_themes`, `ai_blog_config`, `ai_blog_images`, `ai_blog_seo`).

---

### Plano de Correção

**1. Criar as 5 tabelas do modulo blog** (migration SQL):
- `ai_blog_config` — configuracao por fotografo (company_name, default_cta, default_tone, etc.)
- `blogs` — posts (title, slug, content, keyword, status, mode, word_count, images, etc.)
- `ai_themes` — temas gerados por IA (title, keyword, intent, status, etc.)
- `ai_blog_images` — imagens dos blogs (blog_id, position, image_url, alt_text, etc.)
- `ai_blog_seo` — metadados SEO (meta_title, meta_description, slug, score, checklist, etc.)
- RLS habilitado em todas, politicas para authenticated users filtrando por photographer_id
- Remover tabelas legadas orfas: `blog_posts`, `blog_themes`, `blog_settings`, `blog_categories`

**2. Criar as 3 Edge Functions faltando:**
- `generate-themes` — usa Lovable AI Gateway (Gemini) para gerar 10 temas de blog
- `generate-blog` — usa Lovable AI Gateway para gerar artigo completo com SEO
- `generate-blog-image` — usa Lovable AI Gateway (modelo de imagem) para gerar imagens

**3. Criar bucket de storage** `blog-module` via migration

**4. Corrigir `check-subscription`** — trocar `npm:` por `https://esm.sh/`

**5. Atualizar `delete-account`** — adicionar as 5 novas tabelas do blog

**6. Atualizar types.ts** — sera automatico apos migration

### Arquivos a criar
- Migration SQL (tabelas + RLS + storage bucket)
- `supabase/functions/generate-themes/index.ts`
- `supabase/functions/generate-blog/index.ts`
- `supabase/functions/generate-blog-image/index.ts`

### Arquivos a modificar
- `supabase/functions/check-subscription/index.ts` (fix import)
- `supabase/functions/delete-account/index.ts` (add new tables)

