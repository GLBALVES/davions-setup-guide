
# Plano: Loja do Fotógrafo

Vamos criar uma "Loja" que reúne tudo o que o fotógrafo vende — **sessões** (booking) e **galerias** publicadas (download/prints pagos) — em dois formatos: uma **página dedicada** (`/shop`) e um **bloco arrastável** que pode ser inserido em qualquer página do editor. A visibilidade é controlada por um novo painel **Settings → Loja**.

## O que o fotógrafo verá

### 1. Página dedicada `/shop`
- **URL subfolder:** `davions.com/store/{slug}/shop`
- **URL custom domain:** `meusite.com/shop`
- Reaproveita o `PublicSiteRenderer` (mesmo header com menu, mesmo footer, sem slides) — mesma UX já adotada nas páginas de Termos/Privacidade.
- Conteúdo: hero curto com título + descrição configuráveis, depois grid responsivo de produtos com filtros por aba: **Todos · Sessões · Galerias**.
- Cada card mostra capa, título, preço a partir de, badge ("Sessão" ou "Galeria") e botão "Ver detalhes" → leva para `/book/:slug` (sessões) ou `/gallery/:slug` (galerias).

### 2. Bloco "Loja" no editor
- Aparece em **Add Block → Commerce → Loja** com 4 variantes (grid 3-col, grid 4-col, carousel, "destaques" 2-col).
- Props editáveis no painel lateral:
  - Título da seção (ex: "Pacotes & Galerias")
  - Subtítulo
  - Filtro: Tudo / Apenas Sessões / Apenas Galerias / Selecionar manualmente IDs
  - Limite de itens (4, 8, 12, todos)
  - Ordem (manual, mais recentes, preço crescente, preço decrescente)
  - Mostrar preço (sim/não)
  - Texto do botão (default: "Ver detalhes")
- Visualmente, o bloco enriquece automaticamente com sessões/galerias reais do estúdio (mesmo padrão já usado em `enrichSectionsWithContent`).

### 3. Settings → Loja (novo SubPanel)
- Toggle **Ativar a Loja** (escreve em `photographer_site.show_store`).
- Quando ativo:
  - Adiciona automaticamente o link **"Shop"** no menu do site (após Home, antes de Contato).
  - Adiciona link **"Shop"** no footer.
- Campos adicionais:
  - **Título da página** (default i18n: "Shop" / "Loja" / "Tienda")
  - **Subtítulo / descrição** (textarea curta)
  - **Mostrar sessões** (toggle, default ON)
  - **Mostrar galerias publicadas** (toggle, default ON)
  - **Layout padrão** (grid 3-col / grid 4-col / lista)
- Botão "Ver loja pública" abre `/shop` em nova aba.

## Mudanças técnicas

### Banco de dados (migração)
Adicionar à tabela `photographer_site`:
- `shop_title` (texto) — título da página da loja
- `shop_description` (texto) — subtítulo
- `shop_show_sessions` (booleano, default true)
- `shop_show_galleries` (booleano, default true)
- `shop_layout` (texto, default `'grid-3'`)

Reaproveitar a coluna existente `show_store` como master toggle (já existe e já é usada em `Personalize.tsx`).

### Novos arquivos
- `src/lib/shop-defaults.ts` — textos default i18n para título/descrição.
- `src/pages/store/PublicShopPage.tsx` — página `/shop`. Carrega photographer + site + sessões (status=active, hide_from_store!=true) + galerias (status=published) e renderiza dentro de `PublicSiteRenderer` passando o grid de produtos como sub-page node.
- `src/components/store/ShopGrid.tsx` — componente reutilizável que recebe `{sessions, galleries, layout, showFilters, t}` e renderiza grid + filtros por aba. Usado pela página dedicada e pelo bloco.
- `src/components/website-editor/settings/ShopSubPanel.tsx` — novo painel em Settings.

### Arquivos a editar
- `src/components/store/PublicSiteRenderer.tsx`
  - Estender prop `subPageHtml` para também aceitar `subPageNode?: React.ReactNode` (renderiza node em vez de HTML quando presente).
  - Quando `site.show_store === true`, prepend link "Shop" antes dos extras no header e replicar no footer.
- `src/components/store/SectionRenderer.tsx`
  - Adicionar `case "shop":` chamando novo `ShopBlock` (wrapper sobre `ShopGrid` que faz fetch via context com `photographer_id`).
- `src/components/website-editor/AddBlockPicker.tsx` + `block-variants.ts` + `BlockThumbnail.tsx`
  - Registrar novo tipo `shop` na categoria "Commerce" com 4 variantes e thumbnails.
- `src/components/website-editor/PreviewRenderer.tsx`
  - Renderizar bloco `shop` em modo preview (mesmo `ShopBlock`).
- `src/components/website-editor/settings/SettingsPanel.tsx`
  - Adicionar item **Loja** (ícone `Store` do lucide) em "Site Settings", abrindo `ShopSubPanel`.
- `src/App.tsx`
  - Novas rotas:
    - `/store/:slug/shop` → `PublicShopPage` (subfolder)
    - `/shop` → `PublicShopPage` (custom domain)
- `src/pages/store/StorePage.tsx` e `src/pages/store/CustomDomainStore.tsx`
  - Incluir `shop_title, shop_description, shop_show_sessions, shop_show_galleries, shop_layout` no `select`.
  - Passar `show_store` ao builder de nav links para inserir o "Shop" automaticamente.
- `src/lib/site-navigation.ts`
  - Suportar parâmetro `shopLink?: { href: string; label: string }` que insere o link logo após Home.
- i18n (`LanguageContext` / dicionários)
  - Novas chaves: `shop.title`, `shop.description`, `shop.allTab`, `shop.sessionsTab`, `shop.galleriesTab`, `shop.viewDetails`, `shop.startingAt`, `shop.empty`, `settings.shop` nos 3 idiomas (EN/PT-BR/ES).

### Comportamento dos cards
- **Sessão**: capa = `cover_image_url`, preço = `price` (cents → moeda), badge "Sessão", link `/book/{slug ?? id}` (subfolder usa `/store/{slug}/{slug}`).
- **Galeria**: capa = `cover_image_url`, preço = "A partir de R$ X" usando `price_per_photo` quando > 0; badge "Galeria", link `/gallery/{slug ?? id}`.
- Se `price === 0` ou ausente: ocultar preço (mostra apenas "Sob consulta").

### Estados vazios
- Se `show_store=true` mas não há sessões nem galerias publicadas: a página exibe mensagem amigável ("Em breve novidades por aqui") e o link "Shop" é ocultado automaticamente do menu/footer para não criar página vazia.

## Diagrama de arquitetura

```text
                   ┌─────────────────────────┐
                   │ photographer_site       │
                   │  show_store, shop_*     │
                   └────────────┬────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
 ShopSubPanel          PublicShopPage           ShopBlock
 (editor settings)     (/shop dedicada)         (bloco arrastável)
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                │
                                ▼
                       ShopGrid (componente)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
         sessions (active)           galleries (published)
```

## Fora do escopo
- Não cria nova entidade "produtos físicos" (prints, álbuns, gift cards). Se quiser adicionar isso depois, podemos modelar uma tabela `shop_products` separada — me avise.
- Não altera o fluxo de checkout existente (sessões continuam usando `/book`, galerias continuam usando o checkout de download por foto).
- Não toca em Stripe Connect: a Loja é apenas vitrine + redirecionamento para os fluxos de compra que já existem.
