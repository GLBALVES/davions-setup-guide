
## Galleries: Fluxo completo

### Estado atual
- `Dashboard.tsx` lista galerias com cards básicos (sem click)
- `GalleryCard.tsx` renderiza um card com thumbnail placeholder e info
- A sidebar já tem link `/dashboard/galleries` mas a rota não existe
- Backend functions existem: `add-photo`, `delete-photo`, `delete-gallery`, `create-gallery`, `update-gallery`
- Storage bucket `gallery-photos` já existe (público)
- Tabelas: `galleries` (id, title, slug, category, status, access_code, photographer_id) e `photos` (id, gallery_id, storage_path, filename, order_index)

### O que será construído

```
/dashboard → lista de galerias (já existe, melhorar)
/dashboard/galleries → mesma página de lista
/dashboard/galleries/:id → NOVO: página de detalhes da galeria
```

---

### 1. Rota de lista dedicada (`/dashboard/galleries`)
Mover a lista de galerias para `src/pages/dashboard/Galleries.tsx` e registrar no `App.tsx`. O Dashboard principal continuará existindo com os stats.

### 2. Página de detalhes da galeria — `src/pages/dashboard/GalleryDetail.tsx`

**Layout:**
- Header com nome da galeria, badge tipo (Proof/Final), status pill (Draft/Published), botão "Publish/Unpublish" e menu de ações (renomear, deletar)
- Área principal: grid de fotos (3–4 colunas) com thumbnail real, botão de remoção por foto (hover)
- Zona de upload: drag & drop ou click, com suporte a múltiplos arquivos, barra de progresso por arquivo
- Painel lateral (ou rodapé): seção **Link de acesso para o cliente** — campo com o link gerado + botão de copiar, toggle para ativar/desativar acesso, input de código de acesso opcional

**Upload direto no browser:**
- Usa o bucket `gallery-photos` via Supabase SDK client (`supabase.storage.from("gallery-photos").upload()`)
- Não precisa do edge function `add-photo` (esse é para o plugin Lightroom); o upload direto é client-side
- Após upload no storage, insere o registro em `photos`
- Progress via `onUploadProgress` do Supabase SDK

**Link de acesso para o cliente:**
- URL pública: `/gallery/:galleryId` (nova rota pública)
- Acesso controlado por `access_code` na tabela `galleries` (campo já existe)
- Se `access_code` estiver preenchido → o cliente precisa digitar o código para ver
- Toggle "Publicar galeria" = atualiza `status` para `published`/`draft`

### 3. Visualização pública — `src/pages/gallery/GalleryView.tsx`
Página acessível sem login, rota `/gallery/:id`:
- Tela de desbloqueio com input de código (se `access_code` estiver configurado)
- Grid de fotos após autenticação
- Fotos carregadas via URL pública do bucket
- Para galeria `final`: botão de download por foto

### 4. `GalleryCard.tsx` — tornar clicável
Envolver em `Link` para `/dashboard/galleries/:id`.

### 5. Rotas a adicionar no `App.tsx`
```
/dashboard/galleries            → <Galleries />
/dashboard/galleries/:id        → <GalleryDetail />
/gallery/:id                    → <GalleryView /> (pública)
```

### 6. RLS para visualização pública
A tabela `galleries` só permite leitura por `authenticated` hoje. Precisamos de uma policy de leitura pública para galerias com `status = 'published'`, e idem para `photos`.

**Migration necessária:**
```sql
-- Allow public read of published galleries
CREATE POLICY "Anyone can read published galleries"
  ON public.galleries FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Allow public read of photos in published galleries
CREATE POLICY "Anyone can read photos in published galleries"
  ON public.photos FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.galleries g
      WHERE g.id = photos.gallery_id AND g.status = 'published'
    )
  );
```

### Arquivos a criar/modificar
| Arquivo | Ação |
|---|---|
| `src/pages/dashboard/Galleries.tsx` | CRIAR — lista dedicada |
| `src/pages/dashboard/GalleryDetail.tsx` | CRIAR — detalhes + upload + link |
| `src/pages/gallery/GalleryView.tsx` | CRIAR — view pública com acesso por código |
| `src/components/dashboard/GalleryCard.tsx` | EDITAR — tornar clicável |
| `src/App.tsx` | EDITAR — adicionar 3 rotas |
| migration SQL | CRIAR — policies públicas |
