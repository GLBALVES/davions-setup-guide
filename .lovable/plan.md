
## Header do Editor: Estrutura e Personalização

### O que será feito

Reestruturar o header do site público para ter layout fixo em 3 colunas (logo | menu | redes sociais), adicionar controle de quais ícones de redes sociais aparecem no header, e permitir escolher a cor de fundo e cor das fontes do menu.

---

### Alterações necessárias

**1. Migração de banco de dados** — 3 novos campos na tabela `photographer_site`:
- `header_bg_color` — cor de fundo do header (ex: `#ffffff`)
- `header_text_color` — cor das fontes do menu (ex: `#000000`)
- `header_visible_socials` — array JSON com as redes habilitadas (ex: `["instagram","whatsapp"]`)

**2. `SiteConfig` interface** (`PublicSiteRenderer.tsx`) — adicionar os 3 campos.

**3. `SharedNav` no `PublicSiteRenderer.tsx`**:
- Remover o comportamento dinâmico de transparência quando o header possui cor de fundo definida
- Aplicar `header_bg_color` e `header_text_color` via `style` inline
- Filtrar `SocialIcons` para mostrar apenas as redes cujos IDs estão em `header_visible_socials`

**4. `BlockPanel.tsx` — seção `header`**:
- Adicionar 2 pickers de cor (fundo e texto) com inputs `type="color"` + campo de hex digitável
- Adicionar checklist de redes sociais para visibilidade no header (Instagram, Facebook, TikTok, YouTube, Pinterest, LinkedIn, WhatsApp) — toggle para cada uma
- O layout do painel fica: Logo → Studio Name → **Header Background Color** → **Menu Font Color** → **Social Icons in Header** (checklist) → Nav visibility → Social URLs

**5. `WebsiteEditor.tsx`** — incluir os 3 novos campos no `siteData` ao salvar.

---

### Layout visual do header resultante

```text
┌─────────────────────────────────────────────────────────────┐
│  [LOGO]          Home · Portfolio · About      [IG][WA][FB] │
└─────────────────────────────────────────────────────────────┘
  ←── esquerda ──→  ←────── centro ──────────→  ←── direita ─→
```

---

### Notas técnicas

- Cor de fundo `#ffffff` com `header_text_color` `#000000` por padrão (armazenado como null = comportamento atual transparente)
- Quando `header_bg_color` é definido, o header perde a transição de transparência e usa a cor fixa com opacidade total
- A checklist de sociais em `header_visible_socials` só filtra a exibição no header — os URLs continuam configurados globalmente e aparecem no footer/contact independente

