

## Limpar o site — Remover páginas extras e resetar

### Problema
O site tem páginas acumuladas no banco de dados (`site_pages`) que estão bagunçando a renderização:
- **Home** (ok, manter)
- **The Experience** — página avulsa sem conteúdo real
- **New Page** — página de teste sem conteúdo

Essas páginas extras com `is_visible: true` podem estar aparecendo na navegação do site público e causando confusão visual.

### Plano

**1. Deletar páginas extras do banco de dados**
- Remover "The Experience" e "New Page" da tabela `site_pages` para este fotógrafo
- Manter apenas a página "Home"

**2. Garantir que o seed não recrie páginas indesejadas**
- Ajustar o `INITIAL_PAGES` padrão para ser mais limpo — começar apenas com Home, sem pastas e páginas genéricas que o usuário não configurou
- As páginas extras (Experience, Investment, etc.) só devem existir se o usuário as criar explicitamente via template picker

**3. Simplificar o INITIAL_PAGES**
- Reduzir para apenas: Home, Blog (link), Contact
- Remover as pastas "The Experience" e "Investment" com seus filhos do seed padrão, já que são placeholders não preenchidos

### Detalhes técnicos
- Executar `DELETE FROM site_pages WHERE photographer_id = 'b57d5abc-...' AND is_home = false` via migration
- Alterar `INITIAL_PAGES` no `WebsiteEditor.tsx` para conter apenas Home + Contact + Blog link
- Nenhuma mudança na tabela ou RLS necessária

