
## Diagnóstico completo

### O que o dashboard configura (photographer_site):
- **Branding**: logo, tagline, accent_color
- **Hero**: site_headline, site_subheadline, cta_text, cta_link, site_hero_image_url
- **About**: about_title, about_image_url + bio/full_name da tabela photographers
- **Social**: instagram, facebook, pinterest, tiktok, youtube, whatsapp, linkedin
- **Navigation**: show_store, show_blog, show_booking, show_about, show_contact
- **Footer**: footer_text
- **SEO**: seo_title, seo_description, og_image_url
- **Template**: site_template (editorial, grid, magazine, clean)

### O que as páginas públicas exibem hoje:
- `StorePage` e `CustomDomainStore`: apenas hero image + nome hardcoded "Photography by" + bio + sessions
- Nenhum dado de `photographer_site` além de `site_hero_image_url`
- Headline, subheadline, CTA, logo, social links, about section, footer — tudo ignorado

### Plano de correção

**Arquivo a alterar: `src/pages/store/StorePage.tsx`**

Ampliar o fetch para buscar todos os campos de `photographer_site`:
```ts
supabase.from("photographer_site")
  .select("site_hero_image_url, site_headline, site_subheadline, cta_text, cta_link, logo_url, tagline, accent_color, about_title, about_image_url, instagram_url, facebook_url, pinterest_url, tiktok_url, youtube_url, whatsapp, linkedin_url, footer_text, show_about, show_contact, show_store")
```

Atualizar o render da `StorePage` para usar os dados configurados:
- **Hero**: usar `site_headline` (em vez de "Photography by"), `site_subheadline` (em vez de bio), `cta_text`/`cta_link` configurados
- **Logo**: exibir `logo_url` no topo se existir
- **About section**: exibir se `show_about` = true com `about_title`, bio e `about_image_url`
- **Social links**: exibir rodapé com ícones das redes configuradas
- **Footer**: usar `footer_text` configurado (fallback "Powered by Davions")

**Arquivo a alterar: `src/pages/store/CustomDomainStore.tsx`**

Aplicar as mesmas mudanças — já tem a estrutura correta mas ignora os mesmos campos.

### Estrutura do novo layout (ambas as pages)

```text
┌─────────────────────────────┐
│ [Logo opcional no topo]     │
│                             │
│  HERO (imagem + overlay)    │
│  ─ site_headline            │
│  ─ site_subheadline         │
│  ─ [CTA button]             │
└─────────────────────────────┘
│  Sessions grid              │
│  Galleries grid (portfolio) │
└─────────────────────────────┘
│  ABOUT (se show_about)      │
│  ─ about_image + bio        │
└─────────────────────────────┘
│  FOOTER                     │
│  ─ social icons             │
│  ─ footer_text              │
└─────────────────────────────┘
```

### Arquivos a alterar
1. `src/pages/store/StorePage.tsx` — ampliar fetch + novo layout com dados configurados
2. `src/pages/store/CustomDomainStore.tsx` — mesma correção para domínios customizados
