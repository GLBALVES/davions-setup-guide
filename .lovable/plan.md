

## Adicionar controle de cor de fundo e fonte em todas as seções do site

### Contexto
Atualmente, apenas o **Header** e o **Footer** possuem seletores de cor de fundo e cor de texto no editor. As demais seções (Hero, Sessions, Portfolio, About, Quote, Experience, Contact, Testimonials) usam cores fixas do tema.

### Plano

**1. Expandir o `SiteConfig` com campos de cor por seção**

Adicionar ao tipo `SiteConfig` em `PublicSiteRenderer.tsx` pares `{section}_bg_color` e `{section}_text_color` para cada seção:
- `hero_bg_color`, `hero_text_color`
- `sessions_bg_color`, `sessions_text_color`
- `about_bg_color`, `about_text_color`
- `quote_bg_color`, `quote_text_color`
- `experience_bg_color`, `experience_text_color`
- `contact_bg_color`, `contact_text_color`
- `testimonials_bg_color`, `testimonials_text_color`

**2. Criar componente reutilizável `SectionColorFields` no `BlockPanel.tsx`**

Extrair o padrão já usado no footer (color picker + input hex + botão reset) em um componente reutilizável que aceita `section` como prop e emite as chaves `{section}_bg_color` / `{section}_text_color`. Será inserido em cada bloco do `BlockPanel`.

**3. Adicionar os controles de cor no painel de cada seção**

Em cada bloco do `BlockPanel` (hero, sessions, portfolio, about, quote, experience, contact, testimonials), adicionar o `SectionColorFields` ao final dos campos existentes.

**4. Aplicar as cores no `PublicSiteRenderer.tsx`**

Em cada `<section>`/`<div>` com `data-block-key`, aplicar `style={{ backgroundColor, color }}` lendo os campos correspondentes do `site` config. Isso será feito via uma helper function `getSectionStyle(site, sectionKey)` para manter o código DRY.

### Arquivos alterados
- `src/components/store/PublicSiteRenderer.tsx` — tipo `SiteConfig` + aplicação de estilos inline
- `src/components/website-editor/BlockPanel.tsx` — componente `SectionColorFields` + uso em cada bloco

### Sem migração de banco
Os campos de cor já são armazenados no JSONB da coluna `site_config` da tabela `photographers`, portanto não é necessária nenhuma migração.

