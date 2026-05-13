## Objetivo

Criar uma área dedicada de personalização da **Vitrine** dentro do Website Editor atual (`/dashboard/website/editor`), com edição visual drag-and-drop dos blocos da home + painel lateral para Identidade, Layout/Subpáginas e SEO — tudo com campos separados por idioma (PT-BR / EN / ES).

## Escopo

1. **Identidade visual + tipografia da Vitrine**
2. **Layout, seções e subpáginas (Shop / Blog / Legal)**
3. **SEO e Open Graph por idioma**

Fora de escopo: domínio/slug e wizard de onboarding.

## Onde vive no editor

Adicionar uma nova entrada **"Vitrine"** no `SettingsPanel.tsx` (acima de "Showcase"), abrindo um sub-painel dedicado que agrupa as 3 áreas em abas internas:

```text
Settings → Site Settings
├── Domain
├── Vitrine        ← NOVO (entrada principal)
│    ├── Identidade
│    ├── Layout & Subpáginas
│    └── SEO (PT/EN/ES)
├── Showcase
├── SEO Manager
└── …
```

A canvas central continua sendo o editor visual drag-and-drop existente (blocos do `PublicSiteRenderer` reaproveitados), agora respeitando o idioma ativo do preview.

## Estrutura do painel "Vitrine"

### Aba 1 — Identidade
- Logo (claro/escuro), favicon, nome do estúdio, tagline
- Paleta (`COLOR_PALETTES` + custom) e esquema (`SchemeId`)
- Tipografia (heading + body) via `useSiteTypography`
- Reusa: `ColorsSubPanel`, `FontsSubPanel`, `useSiteColors`, `useSiteSpacing` (já existentes)

### Aba 2 — Layout & Subpáginas
- Largura máxima e padding base (reusa `SpacingSubPanel`)
- Toggle/ordem das seções da home (drag-and-drop na lista de blocos)
- Toggles + título/descrição de **Shop**, **Blog**, **Legal** — cada um com 3 inputs por idioma
- Reusa: `ShopSubPanel`, `BlogSubPanel`, `LegalSubPanel` estendidos com `LanguageTabs`

### Aba 3 — SEO (PT/EN/ES)
- Para cada idioma: `seo_title`, `seo_description`, `og_image`, `canonical override`
- Preview SERP por idioma
- Reusa `SeoSubPanel` envolvendo cada conjunto em `<Tabs value={lang}>`

## Persistência (PT/EN/ES)

Hoje `photographer_site` guarda campos planos (`seo_title`, `site_subheadline`, `shop_page_title`…). Para suportar 3 idiomas sem quebrar o que existe:

- Adicionar coluna `i18n jsonb` em `photographer_site` no formato:
  ```json
  {
    "pt-BR": { "seo_title": "...", "seo_description": "...", "shop_title": "...", ... },
    "en":    { ... },
    "es":    { ... }
  }
  ```
- Os campos planos atuais permanecem como **fallback** (compatibilidade).
- Helper `getI18nField(site, lang, key)` lê `i18n[lang][key]` → fallback ao campo plano → fallback ao default localizado (`getShopDefaults`, `getBlogDefaults`).
- `PublicSiteRenderer.tsx` e subpáginas passam a ler via esse helper, mantendo a saída SEO já corrigida.

## Componentes novos / alterados

**Novos**
- `src/components/website-editor/settings/VitrineSubPanel.tsx` — container com 3 abas
- `src/components/website-editor/settings/LanguageTabs.tsx` — tabs PT/EN/ES reutilizáveis
- `src/lib/site-i18n.ts` — `getI18nField`, `setI18nField`, tipos

**Alterados**
- `src/components/website-editor/settings/SettingsPanel.tsx` — adiciona item "Vitrine" e roteia para o novo subpanel
- `ShopSubPanel.tsx`, `BlogSubPanel.tsx`, `LegalSubPanel.tsx`, `SeoSubPanel.tsx` — envelopam campos textuais em `LanguageTabs` + gravam em `i18n[lang][key]`
- `src/components/store/PublicSiteRenderer.tsx` + páginas `Public*Page.tsx` — leem via `getI18nField(site, lang, key)`
- `src/lib/shop-defaults.ts`, `blog-defaults.ts`, `legal-defaults.ts` — já localizados, viram só fallback

## Migração de dados

Migration:
```sql
ALTER TABLE public.photographer_site
  ADD COLUMN IF NOT EXISTS i18n jsonb NOT NULL DEFAULT '{}'::jsonb;
```
Sem backfill destrutivo: campos planos continuam respondendo até serem sobrescritos pelo novo painel.

## Preview

- O header do editor já tem switcher de idioma do `LanguageContext`. O preview central re-renderiza ao trocar idioma usando `getI18nField`.
- Adicionar ao topo do `VitrineSubPanel` um seletor de idioma sincronizado com o preview.

## Validação

- Testes manuais em `/dashboard/website/editor`: trocar logo, paleta, fonte → ver preview atualizar.
- Editar título Shop em PT, alternar para EN → mostrar fallback default em inglês até ser preenchido.
- Publicar e abrir `/vitrine/:slug?lang=pt-BR|en|es` — confirmar que SEO/OG e textos respeitam o idioma.
- Rodar geração do `sitemap.xml` (sem mudança).

## Entregáveis

1. Migration `add_i18n_to_photographer_site`
2. `VitrineSubPanel` + `LanguageTabs` + `site-i18n.ts`
3. Subpaneis Shop/Blog/Legal/SEO atualizados com tabs PT/EN/ES
4. `PublicSiteRenderer` + páginas públicas lendo via helper i18n
5. Item "Vitrine" no `SettingsPanel` do editor
