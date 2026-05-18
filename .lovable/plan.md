## Objetivo

Transformar a página **Showcase** em uma página "quase normal" do editor: header editável (com opção de copiar/compartilhar header de outra página, igual às outras páginas) e blocos arrastáveis (Sessions selecionadas, Galleries selecionadas, e blocos genéricos — texto, imagem, vídeo, CTA, etc.) renderizados acima e abaixo da grade automática de produtos.

Mantém-se a rota especial `/vitrine/{slug}/shop` (sem virar slug livre na tabela `pages`).

## Backend (migration)

Adicionar colunas em `photographer_site`:

- `shop_header_config jsonb` — mesma forma do `header_config` das páginas. Quando `null`, herda o header global do site (comportamento atual).
- `shop_blocks_above jsonb default '[]'::jsonb` — array de blocos (mesmo schema dos blocos de páginas normais) renderizados antes da grade.
- `shop_blocks_below jsonb default '[]'::jsonb` — array renderizado depois da grade.
- `shop_show_default_grid boolean default true` — permite ocultar a grade automática se o usuário quiser usar só blocos manuais.
- `shop_manual_sessions uuid[] default '{}'` — quando preenchido, a grade lista somente essas sessões (na ordem fornecida).
- `shop_manual_galleries uuid[] default '{}'` — idem para galerias.

Nada disso requer RLS nova (a tabela já tem políticas).

## Editor (frontend)

### 1. Header editável no Showcase
- Tratar `__shop__` como uma página com `headerConfig` derivado de `site.shop_header_config`.
- Quando o usuário abre o Showcase no editor, mostrar o `HeaderSettingsPanel` existente (mesma UI usada nas páginas) e permitir:
  - editar slides / overlay / menu
  - **compartilhar** header com outra página (`shareHeaderWithPage`)
  - **copiar** header independente de outra página (`copyHeaderFromPage`)
- Persistir em `photographer_site.shop_header_config` em vez da tabela `pages`.

### 2. Renderizar blocos no canvas
- Mostrar o `PreviewRenderer` no canvas do editor com:
  - Header preview (usando `shop_header_config`)
  - `shop_blocks_above`
  - Grade automática (placeholder visual no editor; iframe real continua sendo a verdade final)
  - `shop_blocks_below`
- Reutilizar `AddBlockPicker`, `BlockToolbar`, `BlockSettingsPanel` para inserir/editar/remover/reordenar blocos.
- Substituir o overlay de iframe atual por esse render direto (mais rápido, sem reload).

### 3. Seleção manual de Sessions / Galleries
Novo painel (`ShopSubPanel` reaproveitado / estendido) com 3 abas:
- **Layout** (já existe: layout, filtros, preço, order, limit) + toggle "Mostrar grade automática".
- **Sessions** — checklist arrastável das sessões publicadas. Se vazio = automático (comportamento atual). Se preenchido = só essas, nessa ordem.
- **Galleries** — idem para galerias.

### 4. Renderer público (`PublicShopPage.tsx`)
- Ler `shop_header_config` e passar como `pageHeaderConfig` (igual SiteSubPage).
- Renderizar `shop_blocks_above` antes do título/grade e `shop_blocks_below` depois, usando o mesmo componente que renderiza blocos em páginas normais.
- Se `shop_show_default_grid === false`, omitir a grade.
- Se `shop_manual_sessions`/`shop_manual_galleries` tiverem itens, filtrar a query por esses ids e ordenar conforme o array.

## Arquivos afetados

```text
supabase/migrations/<novo>.sql          (colunas novas)
src/pages/dashboard/WebsiteEditor.tsx   (Showcase como página com header + blocos)
src/components/website-editor/settings/ShopSubPanel.tsx (abas Sessions/Galleries + toggle grade)
src/components/website-editor/HeaderSettingsPanel.tsx   (aceitar source = 'shop')
src/pages/store/PublicShopPage.tsx      (renderizar header_config + blocos + filtros manuais)
src/integrations/supabase/types.ts      (regenerado pela migration)
```

## Fora de escopo

- Não vira página em `pages` (slug não muda; sem novo registro).
- Não implementa blocos novos exclusivos do Showcase — reusa o catálogo existente.
- Sem mudanças em SEO/sitemap além do que já existe.
- Sem refator dos componentes de bloco em si.

## Entrega incremental

Será entregue em **duas etapas dentro deste turno** se possível, ou divido em dois turnos:
1. Migration + header editável + render de blocos genéricos.
2. Seleção manual de Sessions/Galleries + toggle "ocultar grade".

Se o turno ficar grande demais, paro após (1) e confirmo antes de seguir para (2).
