

## Diagnóstico do header atual no preview

**O que existe hoje (`PreviewRenderer.tsx` → `PreviewNav`):**
- Header tradicional: logo à esquerda, menu à direita, fundo sólido (`headerBg`)
- Sticky simples, sem altura definida (só padding `py-4`)
- Sem slider, sem hover handles, sem botões Change Layout/Settings
- `HeaderSliderPanel` existe mas usa `useState` local — não persiste, não emite nada pro preview, fica isolado

**Gap vs. spec aprovado:**
1. Logo deve ser **central**, dividindo o menu (metade dos links à esquerda, metade à direita)
2. Fundo deve ser **slider de imagens** (não cor sólida)
3. Altura **auto ~60vh** (hero-like)
4. **Hover** mostra botões "Change Layout" e "Settings"
5. Clicar no slider abre o `HeaderSliderPanel` na sidebar
6. **Placeholder Unsplash** + aviso "imagem demo" quando vazio
7. **Por página**: cada página tem seu próprio config de header
8. Slider configurável: autoplay on/off, velocidade, transição fade/slide

---

## Plano de implementação

### 1. Backend — persistência por página

Migration: adicionar coluna `header_config jsonb` em `site_pages`:
```json
{
  "layout": "logo-center",
  "slides": [{ "id": "...", "title": "", "imageUrl": "..." }],
  "autoplay": true,
  "speed": 5000,
  "transition": "fade",
  "height": "60vh",
  "overlayOpacity": 0.3
}
```
Default `null` → usa placeholder Unsplash.

### 2. `PreviewRenderer.tsx` — novo `PreviewHeader`

Substituir o `PreviewNav` atual por `PreviewHeader` com:
- **Slider de fundo** (crossfade ou slide, baseado em `transition`), autoplay opcional
- **Altura `60vh`** (configurável)
- **Logo central** entre duas metades do menu (split do `navLinks` ao meio)
- **Overlay** escuro pra contraste (opacity configurável)
- **Texto branco** sobre o slider por padrão
- Quando sem slides → placeholder Unsplash + badge `"imagem demo"` no canto
- **Hover overlay** (só `editMode`) com 2 botões: `Change Layout` e `Settings` → ambos disparam `onEditHeader()` callback que abre o `HeaderSliderPanel` na sidebar
- Click direto no fundo também abre o painel

### 3. `HeaderSliderPanel` — conectar ao preview e ao banco

- Receber `value: HeaderConfig` e `onChange` via props (controlled)
- Adicionar controles: **Layout** (só "Logo Central" agora), **Speed** (slider 2-10s), **Transition** (fade/slide), **Height** (slider 40-100vh), **Overlay opacity**
- Upload de imagem por slide via `EditableImage` no bucket `site-assets`
- Persistir em `site_pages.header_config` via debounce (igual ao resto do editor)

### 4. `WebsiteEditor.tsx` — wiring

- Carregar `header_config` da página ativa e passar pro `PreviewRenderer`
- Adicionar `onEditHeader` que seta `editingSection = "header-slider"` na sidebar
- `HeaderSliderPanel` agora recebe `pageId` + `value` + `onChange`
- Salvar via mesma rotina de debounce que salva sections

### 5. i18n

Adicionar nas 3 linguas: `changeLayout`, `headerSettings`, `slideSpeed`, `transition`, `fadeTransition`, `slideTransition`, `headerHeight`, `overlayOpacity`, `demoImage`, `logoCenter`.

---

## Arquivos afetados
- **Migration nova**: adiciona `site_pages.header_config jsonb`
- **`src/components/website-editor/PreviewRenderer.tsx`**: substitui `PreviewNav` por `PreviewHeader` com slider
- **`src/pages/dashboard/WebsiteEditor.tsx`**: refatora `HeaderSliderPanel` (controlled + persistência), adiciona load/save do `header_config` por página, wiring do `onEditHeader`
- **`src/lib/i18n/translations.ts`**: novas chaves EN/PT/ES

---

## Detalhes técnicos
- Placeholder Unsplash: `https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1920` (hero photography)
- Split do menu: `navLinks.slice(0, Math.ceil(n/2))` à esquerda, resto à direita; logo central no meio
- Slider: `useEffect` com `setInterval` baseado em `autoplay` + `speed`, transição CSS via `opacity` (fade) ou `transform: translateX` (slide)
- Mobile: logo central sobre menu hamburger (escopo posterior se quiser)

