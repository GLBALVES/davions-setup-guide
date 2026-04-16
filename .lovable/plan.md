
## Diagnóstico

O preview continua mostrando conteúdo porque hoje existem **duas fontes de verdade diferentes**:

1. **Sidebar/editor de páginas** usa a tabela `site_pages`
2. **Preview do site** (`/store/:slug`) ainda renderiza a home a partir de `photographer_site` + template legado em `PublicSiteRenderer`

Então, quando você apaga todas as páginas, a sidebar fica vazia, mas o preview ainda monta hero/about/quote/etc. com os campos antigos salvos no site global. Ou seja: **você apagou as páginas, mas não apagou o conteúdo legado que o preview ainda usa**.

Tem mais um detalhe estrutural:
- o seed atual gera IDs UUID para a página Home, mas o código marca `is_home` comparando `page.id === "home"`, então a home seeded pode nem estar sendo salva corretamente como “home” no banco.

## Plano

### 1. Unificar a home com `site_pages`
- Fazer `/store/:slug` carregar também `site_pages`
- Usar a página marcada como home como fonte da homepage
- Parar de montar a home com o fallback legado de `photographer_site`

### 2. Estado vazio real
Como você escolheu “Mensagem vazia” + “Migrar total”:
- Se não existir nenhuma página/home, o preview e o site público devem mostrar um estado vazio claro
- Exemplo: “Seu site está vazio. Adicione uma página para começar.”
- Esse texto deve respeitar o sistema multi-idioma (PT/EN/ES)

### 3. Corrigir a semântica de Home
- Ajustar seed/criação para salvar a home com `is_home = true`
- Impedir inconsistência onde todas as páginas viram páginas comuns
- Definir uma regra clara:
  - ou existe uma home explícita
  - ou o site está vazio de verdade

### 4. Fazer o renderer público usar os blocos salvos
- Ler `page_content.sections` / `sections_order` da home
- Renderizar a homepage pelos blocos do editor, não pelos campos fixos antigos
- Reaproveitar a arquitetura nova de blocos/variantes já iniciada no editor

### 5. Desacoplar conteúdo legado
- Manter em `photographer_site` apenas o que fizer sentido como configuração global:
  - branding
  - cores
  - SEO
  - favicon
  - links sociais
- Remover o papel dele como “conteúdo principal da home”

### 6. Reparar dados existentes
- Fazer um ajuste de dados para identificar/marcar corretamente a home onde necessário
- Se um fotógrafo não tiver nenhuma página após a migração, o site passa a mostrar a mensagem vazia
- Se tiver páginas, a home vira a fonte oficial do preview/publicação

## Arquivos impactados

- `src/pages/store/StorePage.tsx`
- `src/components/store/PublicSiteRenderer.tsx`
- `src/pages/dashboard/WebsiteEditor.tsx`
- possivelmente um helper novo para resolver “home page + sections + empty state”

## Resultado esperado

Depois dessa mudança:
- apagar todas as páginas deixa o site realmente vazio
- o preview não mostra mais conteúdo fantasma
- a homepage passa a obedecer o editor de páginas/blocos
- a arquitetura fica consistente com o sistema novo de blocos, toolbar, variantes e Instagram feed

## Detalhes técnicos
- Não parece exigir nova tabela
- Pode exigir ajuste de dados existentes para normalizar `is_home`
- A implementação deve remover o fallback legado da home no renderer público
- Validar fluxo completo:
  - site sem páginas
  - site com 1 home
  - troca de template
  - menu/header/footer
  - mobile
