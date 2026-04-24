
# Plano: Aba "Posts" funcional no Editor de Site

Transformar o placeholder atual `BlogPanel` em `BlogPostsPanel` — uma lista funcional de posts no painel lateral do editor, inspirada no Pixieset.

## O que o usuário verá

### Painel lateral "Posts" (sidebar do editor)
- **Header**: título "Blog Posts" + botão "+ Novo Post" (abre `/dashboard/blog/gerador` em nova aba) + ícone de configurações (abre `BlogSubPanel`).
- **Busca**: campo para filtrar posts por título.
- **Tabs**: All / Published / Drafts (filtro client-side por `status`).
- **Lista de posts** (rolável):
  - Thumbnail 56x56 (cover_image_url ou fallback gradient com inicial)
  - Título (line-clamp-2)
  - Badge de status: Published (verde) / Draft (cinza)
  - Data de publicação ou "Atualizado em..."
  - Menu `...` (DropdownMenu) com ações:
    - **Editar** → abre `/dashboard/blog/gerador?id={id}` em nova aba
    - **Publicar / Despublicar** → toggle `status` direto no Supabase
    - **Duplicar** → cria novo registro clonando campos
    - **Ver no site** → abre `/blog/{slug}` no preview público
    - **Deletar** → AlertDialog de confirmação
- **Footer do painel**:
  - Botão "Preview Blog" → abre `/blog` público em nova aba
  - Botão "Gerenciar tudo" → abre `/dashboard/blog`
- **Estado vazio**: ilustração + texto "Nenhum post ainda" + botão "Criar primeiro post"

## Mudanças técnicas

### Novos arquivos
- `src/components/website-editor/BlogPostsPanel.tsx` — painel principal (substitui o BlogPanel placeholder)
- `src/components/website-editor/BlogPostRow.tsx` — item individual da lista

### Arquivo a editar
- `src/pages/dashboard/WebsiteEditor.tsx` — substituir `BlogPanel` no `panelMap` por `<BlogPostsPanel />`. Manter o ícone e label "Posts" do tab.

### Query principal
```ts
supabase
  .from("blogs")
  .select("id, title, slug, status, cover_image_url, published_at, updated_at, keyword, photographer_id")
  .eq("photographer_id", photographerId)
  .order("updated_at", { ascending: false });
```

### Realtime / refresh
- Após cada ação (publish, duplicate, delete) refazer a query e mostrar `toast`.
- Sem realtime — refresh manual via React Query `invalidateQueries(['editor-blog-posts'])`.

### i18n
Adicionar chaves em `src/lib/i18n/translations.ts` (EN/PT-BR/ES):
- `editor.blog.title`, `editor.blog.newPost`, `editor.blog.search`
- `editor.blog.tabs.all/published/drafts`
- `editor.blog.empty.title/description/cta`
- `editor.blog.actions.edit/publish/unpublish/duplicate/view/delete`
- `editor.blog.confirmDelete`, `editor.blog.previewBlog`, `editor.blog.manageAll`
- `editor.blog.toast.published/unpublished/duplicated/deleted/error`

### Comportamento
- Click no row inteiro → abre editor de blog em nova aba (mesmo que "Editar")
- "Publicar" seta `status='published'` + `published_at=now()` se nulo
- "Despublicar" seta `status='draft'`, mantém `published_at`
- "Duplicar" copia título com sufixo "(cópia)", gera novo slug, status='draft', limpa published_at
- Confirmação visual via `toast` para todas ações

## Fora do escopo
- Edição inline de título/conteúdo no painel (continua sendo no `/dashboard/blog/gerador`)
- Reordenação manual (continua por `updated_at`)
- Bulk actions (selecionar vários para deletar/publicar)
