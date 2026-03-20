
## Diagnóstico

O campo `site_template` existe na tabela `photographer_site` e é salvo corretamente pelo dashboard (`WebsiteSettings.tsx` e `Personalize.tsx`). Porém, as duas páginas públicas não fazem nada com ele:

- `SiteConfig` em ambas as páginas não inclui `site_template`
- O `select()` do Supabase não busca `site_template`  
- O layout renderizado é fixo — sempre o estilo "Editorial"

Os 4 templates precisam de layouts visivelmente diferentes:

```text
EDITORIAL  → Hero full-bleed + sessões em grid 3 colunas (atual)
GRID       → Sem hero textual, sessions/galerias em grid denso com hover overlay
MAGAZINE   → Hero menor, 2 colunas principais + coluna lateral, cards mistos
CLEAN      → Centrado, whitespace amplo, tipografia grande, layout coluna única
```

## Plano

### 1. Atualizar `SiteConfig` e fetch em ambas as páginas

Adicionar `site_template` à interface e ao `.select()`:

```ts
interface SiteConfig {
  // ... campos existentes ...
  site_template: string | null;
}
```

### 2. Criar componente de roteamento de template

Um componente `PublicSiteRenderer` que recebe todos os dados e escolhe qual layout renderizar com base em `site_template`.

### 3. Implementar os 4 layouts

Cada template em uma função de render separada (sem arquivos extras — dentro do mesmo arquivo ou como componentes internos):

**Editorial** (atual): hero 60vh full-bleed, grid 3 cols, typography minimal uppercase  
**Grid**: hero compacto 40vh, sessions em grid 2-4 colunas com imagem dominante + overlay de info ao hover  
**Magazine**: hero hero 50vh com headline grande à esquerda, sessions em layout assimétrico (1 destaque + 2 menores), galerias em masonry  
**Clean**: hero 50vh centralizado, sessions em lista vertical centrada max-w-2xl, muita margem, tipografia maior

### 4. Arquivos a alterar

1. **`src/pages/store/StorePage.tsx`** — adicionar `site_template` ao fetch e SiteConfig, rotear para o template correto
2. **`src/pages/store/CustomDomainStore.tsx`** — mesmas alterações

### Nota de implementação

Os layouts distintos são suficientemente diferentes para justificar a feature. Começando pelo mínimo viável: cada template terá pelo menos **estrutura de hero diferente** + **grid de sessions diferente**, tornando a escolha do template perceptível ao fotógrafo.
