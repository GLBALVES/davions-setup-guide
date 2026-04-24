

# Plano: Fazer o Blog Funcionar Publicamente

O módulo de criação no dashboard já está 100% funcional. Falta plugar a "saída pública" — listagem `/blog`, página de post `/blog/:slug`, RLS para leitura anônima e injeção do link no menu.

## O que o usuário verá

### 1. Página de listagem `/blog`
- **URL subfolder:** `davions.com/store/{slug}/blog`
- **URL custom domain:** `meusite.com/blog`
- Reaproveita `PublicSiteRenderer` (mesma UX de Shop/Termos): header com menu + footer, sem slides.
- Conteúdo: hero curto com título "Blog" e descrição configurável, depois grid responsivo de cards de posts (3 colunas no desktop, 1 no mobile).
- Cada card mostra: capa, título, trecho da meta_description, badge de keyword principal, data de publicação, tempo de leitura, botão "Ler mais" → `/blog/:slug`.
- Filtros opcionais por keyword (chips) no topo.
- Paginação simples (12 por página).

### 2. Página de post `/blog/:slug`
- **URL subfolder:** `davions.com/store/{slug}/blog/{post-slug}`
- **URL custom domain:** `meusite.com/blog/{post-slug}`
- Layout tipo "artigo": capa full-width, título, autor (nome do estúdio), data, tempo de leitura, conteúdo HTML renderizado com tipografia limpa.
- Imagem do meio renderizada se existir.
- CTA do post (se configurado) renderizado em destaque no fim.
- Sessão "Posts relacionados" com 3 outros posts do mesmo fotógrafo.
- Botões de compartilhar (WhatsApp, Facebook, X, copiar link).
- SEO completo: `<title>` = meta_title, `<meta description>`, Open Graph (og_title, og_description, og_image), JSON-LD Article schema.

### 3. Integração no menu/footer
- Quando `show_blog === true` **E** existir pelo menos 1 post com `status='published'`:
  - Link "Blog" aparece no header automaticamente (já após "Home", antes de "Contact").
  - Link "Blog" aparece no footer (coluna Menu e Sitemap).
- Se não houver posts publicados, link some automaticamente para evitar página vazia (mesma regra defensiva do Shop).

## Mudanças técnicas

### Banco de dados (migração)

**RLS pública para leitura de posts publicados:**

```sql
CREATE POLICY "Anyone can read published blogs"
ON public.blogs
FOR SELECT
TO anon, authenticated
USING (status = 'published');
```

A política existente (`Photographers can CRUD own blogs`) continua intacta — ela cobre INSERT/UPDATE/DELETE. A nova só libera SELECT pra posts publicados.

### Novos arquivos
- `src/pages/store/PublicBlogListPage.tsx` — lista de posts, segue o padrão do `PublicShopPage.tsx` (carrega photographer + site + sitePages + posts publicados, renderiza dentro de `PublicSiteRenderer` via `subPageBody`).
- `src/pages/store/PublicBlogPostPage.tsx` — página de detalhe do post.
- `src/components/store/BlogList.tsx` — grid reutilizável de cards de blog (recebe `{posts, baseHref, t}`).
- `src/components/store/BlogPostView.tsx` — render de artigo individual + CTA + share + relacionados.
- `src/lib/blog-defaults.ts` — strings i18n para hero/empty/sharing nos 3 idiomas (EN/PT-BR/ES).

### Arquivos a editar
- `src/App.tsx` — adicionar rotas:
  - `/store/:slug/blog` → `PublicBlogListPage` (mode=store)
  - `/store/:slug/blog/:postSlug` → `PublicBlogPostPage` (mode=store)
  - `/blog` → `PublicBlogListPage` (mode=custom-domain)
  - `/blog/:postSlug` → `PublicBlogPostPage` (mode=custom-domain)
- `src/pages/store/StorePage.tsx` e `src/pages/store/CustomDomainStore.tsx`
  - Adicionar `hasBlogContent` (count de posts publicados) e injetar link "Blog" em `visibleNavLinks` quando `show_blog === true && hasBlogContent`.
  - Mesma regra do Shop: insere após "Home", antes de "Contact".
- `src/components/store/PublicSiteRenderer.tsx`
  - Não precisa mudar — já lê `extraNavLinks` que vai incluir o link Blog.
- `src/components/website-editor/settings/BlogSubPanel.tsx`
  - Adicionar campos editáveis: `blog_title` (string) e `blog_description` (textarea) na config do site, que o hero da página `/blog` consome.
  - Adicionar botão "Ver blog público" que abre `/blog` em nova aba.

### Banco — colunas opcionais (migração leve)
Adicionar à tabela `photographer_site`:
- `blog_title` TEXT — título do hero da listagem (default: "Blog" / "Nosso Blog" / "Nuestro Blog")
- `blog_description` TEXT — subtítulo/descrição

### Comportamento de cards (BlogList)
- Capa = `cover_image_url` (fallback: gradient com a primeira letra do título)
- Título: line-clamp-2
- Trecho: `meta_description` ou primeiras 140 chars de `content` (HTML strippado)
- Badge: keyword principal
- Footer do card: data formatada por idioma + `reading_time_minutes`
- Click no card inteiro navega para `/blog/{slug}`

### Comportamento da página de post (BlogPostView)
- Carrega blog via `slug` + `photographer_id` (via store_slug ou custom_domain)
- Se `status !== 'published'`, retorna 404
- Renderiza `content` como HTML sanitizado (já é HTML gerado pela IA, confiável pois é do próprio fotógrafo)
- Posts relacionados: query `blogs` mesmo `photographer_id`, status=published, id != atual, order by published_at desc, limit 3
- SEO injetado via `<SEOHead>` (já existe no projeto)
- Share buttons usam `navigator.share` em mobile, fallback para `window.open` + clipboard

### i18n
Novas chaves em `blog-defaults.ts`:
- `blog.title`, `blog.description`, `blog.empty`, `blog.readMore`, `blog.minRead`
- `blog.relatedPosts`, `blog.share`, `blog.sharedSuccess`, `blog.publishedOn`
- `blog.allPosts`, `blog.byKeyword`

### Estados vazios
- `/blog` sem posts → "Em breve novidades por aqui" + botão de voltar para home (e o link do menu some automaticamente, conforme regra acima).
- Post não encontrado (`/blog/post-inexistente`) → 404 padrão da plataforma.

## Diagrama

```text
┌──────────────────────┐
│ blogs (status=publ.) │ ◄── nova RLS SELECT pra anon
└──────────┬───────────┘
           │
   ┌───────┴────────────┐
   │                    │
   ▼                    ▼
PublicBlogListPage   PublicBlogPostPage
(/blog)              (/blog/:slug)
   │                    │
   └────────┬───────────┘
            │
            ▼
     PublicSiteRenderer
     (header/footer com link "Blog" injetado)
            ▲
            │
   StorePage / CustomDomainStore
   (injeta extraNavLinks: Blog se show_blog && hasPosts)
```

## Fora do escopo
- Comentários públicos nos posts (precisa moderação, podemos adicionar depois com tabela `blog_comments` + RLS).
- Newsletter inscrição na página do blog (já existe módulo de email separado).
- RSS feed (`/blog/rss.xml`) — fácil de adicionar via edge function se solicitado.
- Reordenação manual dos posts (hoje ordenamos por `published_at desc`).

