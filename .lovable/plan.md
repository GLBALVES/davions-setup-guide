

## Plano: Limpar todo o Blog, manter menu e página em branco

### O que será feito
Remover toda a funcionalidade de blog do sistema (páginas, componentes, API, rotas públicas), mantendo apenas:
- O item "Blog" no menu do dashboard sidebar (já existente)
- A rota `/dashboard/blog` apontando para uma página em branco (placeholder)

### Arquivos a modificar

1. **`src/App.tsx`** — Remover imports e rotas: `Blog`, `BlogPostPage`, `BlogEditor`, `/blog`, `/blog/:slug`, `/dashboard/blog/:id`. Manter apenas a rota `/dashboard/blog` apontando para um componente placeholder simples.

2. **`src/pages/dashboard/BlogManager.tsx`** — Substituir todo o conteúdo por uma página em branco com título "Blog" e mensagem "Coming soon" (multi-idioma).

3. **Arquivos a deletar** (conteúdo substituído por vazio ou removidos das importações):
   - `src/pages/blog/Blog.tsx` — deletar
   - `src/pages/blog/BlogPost.tsx` — deletar
   - `src/pages/dashboard/BlogEditor.tsx` — deletar
   - `src/lib/blog-api.ts` — deletar

4. **`src/lib/seo-api.ts`** — Remover entrada `"/blog"` do array de páginas SEO.

5. **`src/pages/store/StorePage.tsx`** — Remover prop `blogHref` e referências ao blog.

6. **`src/components/store/PublicSiteRenderer.tsx`** — Remover seção/bloco de blog se existir.

7. **`src/pages/dashboard/WebsiteEditor.tsx`** — Remover toggle `show_blog` se presente.

8. **`src/pages/dashboard/SiteSeo.tsx`** — Remover referências a blog se houver.

9. **Edge functions** — `supabase/functions/ai-blog-seo/index.ts` — deletar.

### O que NÃO será alterado
- Tabelas do banco (`blog_posts`, `blog_categories`, etc.) permanecem intactas — sem migração destrutiva.
- Item "Blog" no `DashboardSidebar.tsx` permanece como está.
- Bucket `blog-images` permanece.

### Detalhes técnicos
- O `BlogManager.tsx` será reescrito como página simples com `DashboardSidebar` + área central com texto "Blog — Coming soon".
- Traduções existentes para "Blog" no sidebar serão mantidas.

