## Reproduzir o sistema de Fontes do Pixieset

Hoje a aba **Design → Fonts** só tem 2 selects (Heading + Body) usando `FONT_PRESETS` em `src/components/website-editor/site-fonts.ts`. O Pixieset oferece algo bem mais rico: **presets de templates tipográficos** (Made Mirage, Vollkorn, Montserrat, Crimson Text, etc.) que ao serem escolhidos aplicam um pacote completo, e ainda permitem **editar cada elemento** (Headings 1–6, Banner, Paragraphs, Navigation, Buttons, Form labels, Pullquote) ajustando família, peso, estilo, tamanho, line-height, letter-spacing e text-transform.

Vou reproduzir essa experiência mantendo a estética luxury-minimal do Davions.

---

### Fluxo da nova aba "Fonts"

```text
[Aba Design → Fonts]
 ├── Tabs filtro: All | Serif | Sans Serif | Combo
 ├── Lista de Font Templates (cards com preview "Made Mirage / This is example text…")
 │     - Card selecionado mostra: "Font Size: Regular ⌄"   "Edit ✎"
 └── Ao clicar "Edit" → tela "Edit Font Template"
       ├── Headings    → Banner Heading, Banner Subtitle, H1, H2, H3, H4, H5, H6
       ├── Paragraphs  → Paragraph 1, 2, 3
       ├── Navigation  → Logo Text, Navigation, Sub Navigation, Overlay Nav, Overlay Sub Nav
       ├── Buttons     → Button Text (família, peso, estilo, tamanho, line-height, letter-spacing, transform)
       └── Other       → Form Label, Pullquote
```

---

### 1. Biblioteca de Font Templates (presets prontos)

Criar `src/components/website-editor/font-templates.ts` com ~12 templates curados (cada um = combinação de heading + body + tokens por elemento). Exemplos:

- **Made Mirage** — heading: Cormorant Garamond / body: Inter (Combo)
- **Vollkorn** — heading + body: Vollkorn (Serif)
- **Montserrat** — heading + body: Montserrat (Sans)
- **Crimson Text** — Crimson Pro + Inter (Serif/Combo)
- **Editorial Pair** — Playfair Display + Lora
- **Modern Minimal** — DM Serif Display + Raleway
- **Classic Sans** — Poppins + Poppins
- **Boutique** — Cormorant + Montserrat
- ... (+ algumas opções adicionais para preencher categorias)

Cada template define defaults para todos os elementos (h1–h6, banner, paragraph, nav, button, label, pullquote), com `fontFamily`, `weight`, `style`, `fontSize` (px), `lineHeight` (em), `letterSpacing` (em) e `textTransform`.

Adicionar mais Google Fonts em `site-fonts.ts` (Cormorant Pro, Vollkorn, Crimson Pro, URW-substituto via "Libre Franklin", Made Mirage→fallback "Cormorant Garamond" pois Made Mirage é proprietária).

### 2. Persistência (Lovable Cloud)

Adicionar em `photographer_site` 2 colunas novas via migração:
- `font_template_id text` — id do preset escolhido (ex: `"made-mirage"`).
- `font_overrides jsonb` — sobrescrições por elemento feitas pelo usuário (apenas o que diverge do preset). Ex:
  ```json
  { "h1": { "fontSize": 64, "letterSpacing": 0.1 }, "button": { "textTransform": "uppercase" } }
  ```

Manter as colunas atuais `heading_font` / `body_font` para retrocompatibilidade (preenchidas a partir do template escolhido).

### 3. UI da aba Fonts (substituir bloco em `WebsiteEditor.tsx` linhas ~4001–4036)

Criar componente `FontsSubPanel.tsx` em `src/components/website-editor/settings/`:

- **Topo**: tabs `All | Serif | Sans Serif | Combo` filtrando a lista.
- **Lista**: cada card renderiza o nome do template na fonte do heading + frase exemplo na fonte do body, com borda destacada quando ativo.
- **Card ativo**: mostra "Font Size: Regular/Compact/Comfortable ⌄" (escala global +/- 10%) e botão **Edit**.
- **Edit screen**: navegação por categorias (Headings, Paragraphs, Navigation, Buttons, Other) com `Sheet`/painel deslizante interno. Cada item expansível tipo accordion com:
  - Family (Select com `FONT_PRESETS`)
  - Weight (300–800)
  - Style (Normal/Italic)
  - Font Size (slider px)
  - Line Height (slider em)
  - Letter Spacing (slider em)
  - Text Transform (None/Uppercase/Lowercase/Capitalize)
  - Preview ao vivo no topo de cada item.

### 4. Aplicação na renderização (preview + site público)

Em `WebsiteEditor.tsx` (efeito que injeta Google Fonts) e em `PublicSiteRenderer.tsx`:

1. Resolver `effective = merge(template.defaults, font_overrides)`.
2. Injetar `<link>` para todas as famílias usadas no template (não só heading/body).
3. Injetar um `<style id="lov-site-typography">` com regras direcionadas por classe/tag, ex:
   ```css
   .site-h1 { font-family: ...; font-size: ...; line-height: ...; letter-spacing: ...; text-transform: ...; }
   .site-paragraph-1 { ... }
   .site-button { ... }
   ```
4. Garantir que `SectionRenderer.tsx` use essas classes (ex: `EditableText` de heading vira `class="site-h1"`).

### 5. Compatibilidade

- Sites antigos sem `font_template_id` continuam usando `headingFont`/`bodyFont`.
- Ao escolher um template, atualizar também `heading_font` e `body_font` para refletir o template escolhido.
- Inline formatting (cores/tamanhos via `InlineFormatToolbar`) continua sobrescrevendo via `style=""` direto no HTML do bloco.

---

### Arquivos a criar/editar

**Criar:**
- `src/components/website-editor/font-templates.ts` — biblioteca de presets + tipos.
- `src/components/website-editor/settings/FontsSubPanel.tsx` — UI do template picker + editor.
- Migração SQL: adicionar `font_template_id` e `font_overrides` em `photographer_site`.

**Editar:**
- `src/components/website-editor/site-fonts.ts` — adicionar Cormorant Garamond, Vollkorn, Crimson Pro, Libre Franklin.
- `src/pages/dashboard/WebsiteEditor.tsx` — substituir bloco `sub === "fonts"` pelo novo painel; injetar `<style>` global de tipografia derivado do template + overrides.
- `src/components/store/PublicSiteRenderer.tsx` — mesma injeção no site publicado.
- `src/components/store/SectionRenderer.tsx` — adicionar classes `site-h1…site-h6`, `site-paragraph-*`, `site-button`, `site-nav`, etc.
- `src/lib/site-template-content.ts` — incluir `font_template_id` ao carregar/salvar.

### i18n
Strings novas ("Fonts", "Edit Font Template", "Headings", "Paragraphs", "Navigation", "Buttons", "Other", "Banner Heading", "Font Family", "Weight", "Style", "Font Size", "Line Height", "Letter Spacing", "Text Transform") adicionadas em PT-BR / EN / ES via `LanguageContext`.

### Resultado
A aba Design → Fonts passa a se comportar exatamente como o Pixieset: o usuário escolhe um template tipográfico inteiro (cards com preview na fonte real), pode trocar o tamanho global e, com **Edit**, ajusta cada elemento individualmente. Tudo é salvo por estúdio e aplicado no preview e no site publicado.