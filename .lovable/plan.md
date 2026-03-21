
## Site Editor — Editor visual de site estilo Pixieset

### Diagnóstico atual

O sistema já possui:
- `photographer_site` table com todos os campos de configuração (headline, hero, about, redes sociais, template, etc.)
- `WebsiteSettings.tsx` — formulário de configuração com abas (Branding, Hero, About, Social, SEO, Domain)
- `WebsitePreview.tsx` — preview separado do site
- `PublicSiteRenderer.tsx` — 4 templates renderizados (editorial, grid, magazine, clean)
- Rota `/dashboard/website` já existente

O problema: a experiência atual é um formulário de formulários. O usuário não vê o site enquanto edita. O objetivo é transformar isso em um editor split-screen com preview ao vivo, onde o usuário clica nos elementos do site para editá-los — como o Pixieset.

---

### Arquitetura da solução

```text
/dashboard/website/editor          ← nova rota, editor visual
  ┌──────────────────────────────────────────────────────────────┐
  │  [← Sair]  [Template]  [Mobile|Tablet|Desktop]  [Publicar] │  ← Topbar
  ├──────────────────────┬───────────────────────────────────────┤
  │                      │                                       │
  │   PAINEL ESQUERDO    │       CANVAS / PREVIEW AO VIVO       │
  │   (blocos/seções)    │                                       │
  │                      │   [clique para editar inline]         │
  │  + Adicionar seção   │                                       │
  └──────────────────────┴───────────────────────────────────────┘
```

**Painel esquerdo**: lista de seções do site (Hero, Sessions, Portfolio, About, Quote, Contact, Footer). Cada seção tem um botão de configuração. Seções podem ser reordenadas, mostradas/ocultadas.

**Canvas (direito)**: preview do site renderizado com os dados atuais em um `<iframe>` ou renderização direta. Elementos clicáveis abrem o painel de edição correspondente.

**Auto-save**: salva automaticamente no banco quando o usuário para de editar (debounce de 1s).

---

### Estrutura de seções (Blocks)

Cada bloco corresponde a uma seção do `photographer_site`:

| Bloco | Campos editáveis |
|-------|-----------------|
| **Hero** | Imagem, Headline, Subheadline, CTA text, CTA link |
| **Sessions** | Visibilidade (show_store), título da seção |
| **Portfolio** | Visibilidade (show_store para galerias), título |
| **About** | Título, imagem, bio, visibilidade (show_about) |
| **Quote** | Texto, autor |
| **Experience** | Título, texto |
| **Contact** | Visibilidade (show_contact) |
| **Footer** | Texto, links sociais (Instagram, Facebook, etc.) |

---

### Componentes a criar

1. **`src/pages/dashboard/WebsiteEditor.tsx`** — página principal do editor
   - Layout split: painel esquerdo (280px) + canvas
   - Estado local de `siteData` sincronizado com Supabase via debounce
   - Controle de `activeBlock` para qual bloco está sendo editado
   - Viewport switcher (Desktop/Tablet/Mobile)
   - Botão "Publicar" (salva imediatamente) e badge "Salvando..."

2. **`src/components/website-editor/EditorSidebar.tsx`** — painel de blocos
   - Lista de seções arrastáveis com drag-and-drop via `@dnd-kit`
   - Toggle de visibilidade por seção (olho)
   - Clique na seção abre o `BlockPanel` correspondente

3. **`src/components/website-editor/BlockPanel.tsx`** — painel de edição de bloco
   - Renderiza os campos do bloco ativo (inputs, textarea, upload de imagem, color picker)
   - Botão "Voltar para blocos"

4. **`src/components/website-editor/LivePreview.tsx`** — canvas do preview
   - Renderiza `PublicSiteRenderer` diretamente (não iframe) com os dados do estado atual
   - Overlay de clique nos elementos para ativar o bloco correspondente
   - Wraper com scale CSS para viewports menores (tablet/mobile)

5. **`src/components/website-editor/ImageUploadField.tsx`** — componente reutilizável para upload de imagens no editor

---

### Banco de dados

**Não são necessárias migrações.** A tabela `photographer_site` já contém todos os campos necessários. O editor apenas lê e grava nesta tabela.

A coluna `site_sections_order` será adicionada como um array JSON em `photographer_site` para persistir a ordem e visibilidade das seções configuradas pelo usuário.

**1 migração**: adicionar `site_sections_order jsonb default null` em `photographer_site`.

---

### Integração na navegação

- Adicionar rota `/dashboard/website/editor` em `App.tsx`
- Botão "Abrir Editor" na página `WebsiteSettings.tsx` existente (link para o novo editor)
- O `DashboardSidebar` já aponta para `/dashboard/website` — mantém o fluxo natural

---

### Arquivos a criar/editar

**Criar (4 novos):**
- `src/pages/dashboard/WebsiteEditor.tsx`
- `src/components/website-editor/EditorSidebar.tsx`
- `src/components/website-editor/BlockPanel.tsx`
- `src/components/website-editor/LivePreview.tsx`

**Editar:**
- `src/App.tsx` — adicionar rota `/dashboard/website/editor`
- `src/pages/dashboard/WebsiteSettings.tsx` — adicionar botão "Abrir Editor Visual"

**Migração:**
- Adicionar coluna `site_sections_order jsonb` em `photographer_site`

---

### UX do fluxo

1. Usuário acessa **Website → "Abrir Editor Visual"**
2. Editor carrega com split-screen: blocos à esquerda, preview do site ao vivo à direita
3. Clica em uma seção na lista ou diretamente no canvas → painel de edição abre à esquerda
4. Edita campos → preview atualiza instantaneamente (estado local)
5. Salva automaticamente após 1s sem digitação
6. "Publicar" salva imediatamente e redireciona para o site ao vivo
