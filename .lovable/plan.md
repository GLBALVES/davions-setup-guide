## Objetivo

Hoje, ao clicar em um produto na Vitrine, o usuário cai direto no `SessionDetailPage`, que é o fluxo completo de booking (com um passo inicial de "produto"). Vamos separar isso em duas etapas:

1. **Página de Detalhes do Produto** — uma página de vendas editável pelo fotógrafo no editor de site, com blocos arrastáveis. É um **template único** aplicado a todas as sessões, alimentado automaticamente pelos dados de cada sessão.
2. **Página de Booking** — o fluxo atual (escolher horário → form → addons → review → pagamento), acessado via CTA da página de detalhes.

## Mudanças

### 1. Rotas

```text
/vitrine/:slug/:sessionSlug          → NOVO: Página de Detalhes (sales page editável)
/vitrine/:slug/:sessionSlug/book     → NOVO: Fluxo de Booking (extraído do SessionDetailPage)
```

Mesmo padrão para custom domain (`/:sessionSlug` e `/:sessionSlug/book`).

### 2. Editor de Site — nova página virtual "Página do Produto"

Igual ao que fizemos para a Vitrine: aparece no `PagesPanel` como uma página virtual não removível ao lado de "Vitrine". O fotógrafo arrasta blocos numa única página template que é renderizada para qualquer sessão.

Persistência em `photographer_site`:
- `product_page_sections` (jsonb) — array de blocos
- `product_page_header_config` (jsonb) — header próprio (compartilhável com outras páginas via o sistema de groupId já criado)

### 3. Novos blocos especiais "do produto"

Blocos que puxam dados da sessão atual automaticamente:

- **Product Hero** — cover + título + tagline + preço + duração + botão CTA
- **Product Gallery** — masonry/slider com `portfolio_photos`
- **Product Info** — duração, número de fotos, local
- **Product Description** — descrição longa
- **Product Bonuses** — lista de bônus
- **Product Extras** — exibe os add-ons (apenas vitrine, não selecionáveis aqui)
- **Product CTA** — botão grande "Reservar agora" que leva ao booking

Todos os blocos já existentes (texto, imagem, FAQ, depoimentos, etc.) continuam disponíveis para enriquecer a página de vendas.

### 4. Booking CTA em qualquer botão

No painel de configuração de **qualquer bloco com botão** (Hero genérico, CTA, etc.), adicionar opção:
- `action: "book-current-product"` — quando renderizado dentro da página do produto, o botão navega para `/.../{sessionSlug}/book` mantendo a sessão atual em contexto.

### 5. Refactor do SessionDetailPage

- Extrair o passo `"product"` (atualmente nas linhas ~991-1240) e remover dele a navegação para `"slots"`.
- A nova página de detalhes (`ProductDetailsPage`) faz o fetch dos dados da sessão e renderiza os `product_page_sections` do `photographer_site` passando a sessão como contexto para os blocos especiais.
- O `SessionDetailPage` existente vira `SessionBookingPage`, mantendo apenas os passos `slots`, `form`, `addons`, `review` — acessado em `/.../{sessionSlug}/book`.

### 6. Template padrão (seed)

Para fotógrafos que ainda não personalizaram, criar um template default em código com:
1. Product Hero
2. Product Gallery
3. Product Description
4. Product Bonuses
5. Product CTA

Assim a página já funciona "out of the box" e replica o visual atual do passo "product".

## Arquivos afetados (principais)

- **DB migration**: adicionar `product_page_sections` e `product_page_header_config` em `photographer_site`.
- **`src/App.tsx`**: nova rota `/vitrine/:slug/:sessionSlug/book` + custom domain equivalente.
- **`src/pages/store/SessionDetailPage.tsx`**: dividir em `ProductDetailsPage.tsx` (novo) + `SessionBookingPage.tsx` (renomeado, sem step "product").
- **`src/pages/dashboard/WebsiteEditor.tsx`**: adicionar página virtual "Página do Produto" no `PagesPanel`, com lógica de persist similar à Vitrine.
- **`src/components/website-editor/page-templates.ts`**: novos `SectionType` (`product-hero`, `product-gallery`, etc.) + template default.
- **`src/components/store/SectionRenderer.tsx`**: renderers dos novos blocos, recebendo a `session` via context/props.
- **`src/components/website-editor/settings/`**: painéis de edição dos novos blocos + opção "abrir booking" em botões.
- **`src/components/store/ShopGrid.tsx`** + `PublicSiteRenderer.tsx`: nenhum change no `sessionHref` (já aponta para `/:sessionSlug` que agora será a página de detalhes).

## i18n

Adicionar strings PT/EN/ES para nomes dos novos blocos, labels do editor e CTAs padrão.

## Ordem de execução sugerida

1. Migration + tipos
2. Refactor de rotas e split do SessionDetailPage (booking continua funcionando como hoje sob `/book`)
3. Página virtual "Produto" no editor com template default
4. Blocos especiais + renderers
5. Opção "abrir booking" nos botões genéricos
6. Polimento e i18n

Posso começar pelo passo 1 (migration + split de rotas) e seguir incrementalmente. Confirma?
