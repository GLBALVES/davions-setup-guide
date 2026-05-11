## Objetivo

Permitir que fontes carregadas pelo campo **Custom Font CSS** (ex.: Typekit/Adobe Fonts, Google Fonts via `@import`, `@font-face` próprio) apareçam no dropdown **Font Family** de cada elemento (H1, H2, Body, Botões, etc.) — para que possam ser aplicadas pontualmente, sem virarem fonte global.

## UX

No painel **Fontes**, abaixo do textarea "Custom Font CSS" que já existe, adicionar uma sub-seção **"External Font Families"** com:

- Lista de famílias registradas (cada item: nome de exibição + nome da família CSS + botão remover).
- Botão **"+ Add family"** que abre um mini-form com 2 campos:
  - **Display name** (ex.: "Ivy Presto Display")
  - **Font family name** (ex.: `ivypresto-display`) — texto exato que vai pro `font-family` do CSS.
- Botão extra **"Auto-detect from CSS"** que faz parse do conteúdo do `custom_font_css` e sugere famílias detectadas em `@font-face { font-family: ... }` (com 1 clique para adicionar).
- Texto auxiliar: "Add the family name from your CSS provider (Typekit, Google Fonts, etc.) to make it selectable in each element's Font Family dropdown."

No editor de cada elemento, o dropdown **Font Family** ganha um novo grupo **"External"** (separador, depois os itens registrados), em adição aos grupos já existentes ("Custom" para uploads e os presets do sistema).

## Implementação técnica

### 1. Dados
- Nova coluna `external_font_families JSONB NOT NULL DEFAULT '[]'::jsonb` em `photographer_site`.
- Estrutura: `Array<{ id: string; label: string; family: string }>` — `id` é uuid v4 local, `family` é o valor literal usado em `font-family`.

### 2. Tipagem (`site-fonts.ts`)
- Exportar `ExternalFontEntry = { id: string; label: string; family: string }`.
- Atualizar `buildTypographyCss(...)` para receber `externalFonts` e, quando uma override de elemento referenciar `external:<id>`, resolver para o `family` correspondente (envolvido em aspas se contiver espaço/caractere especial).
- Em `getFontStack(id)`, suportar prefixo `external:<id>` lendo de uma lista passada por contexto/parâmetro.

### 3. Hook `useSiteTypography.ts`
- Adicionar parâmetro `externalFonts: ExternalFontEntry[]` e propagar para `buildTypographyCss`.
- Não precisa injetar CSS nenhum — o loading continua sendo responsabilidade do `customFontCss` (que já está implementado). Apenas mapeia ID → nome da família.

### 4. UI `FontsSubPanel.tsx`
- Nova sub-seção `ExternalFontFamiliesSection` (similar à `CustomFontsSection`).
- Função utilitária `parseFamiliesFromCss(css: string): string[]` — regex em `@font-face\s*{[^}]*font-family\s*:\s*['"]?([^;'"}]+)` (case-insensitive). Retorna nomes únicos.
- Em `ElementEditor`, no `<Select>` de Font Family, adicionar grupo "External" listando `externalFonts` com `value="external:<id>"` e label = `entry.label`.

### 5. Wiring (`WebsiteEditor.tsx` e `PublicSiteRenderer.tsx`)
- Persistir `external_font_families` igual aos demais campos do site.
- Passar `externalFontFamilies` para `<FontsSubPanel>` e para `useSiteTypography(...)` em ambos (editor e site público).

### 6. Migração

```sql
ALTER TABLE public.photographer_site
ADD COLUMN external_font_families JSONB NOT NULL DEFAULT '[]'::jsonb;
```

Filtrar essa propriedade no upsert do `photographer_site` se houver lista de campos permitidos (seguir o padrão registrado em mem://architecture/database-schema-constraints).

## Notas

- O Custom Font CSS continua sendo o único responsável por **carregar** as fontes (links Typekit, `@import`, `@font-face`). Esta nova lista só **expõe** nomes para seleção.
- Adobe Fonts/Typekit nem sempre tem `@font-face` no CSS retornado (usa JS interno), por isso o "Auto-detect" é só um auxiliar — o caminho garantido é o usuário digitar o nome manualmente (que o Typekit mostra na página do kit).
- i18n: novas strings em EN/PT-BR/ES (External Font Families / Famílias de fonte externas / Familias de fuente externas, etc.).
