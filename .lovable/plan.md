

# Plano: Refatorar Editor para Comportamento Pixieset

## Diagnóstico (após sua confirmação)

O editor atual tem três problemas estruturais:

1. **Edição inline existe só no painel lateral** — no Pixieset você clica direto no texto/imagem do preview e edita ali. Hoje você é forçado a abrir um painel separado, e mudanças visuais e ações ficam desconectadas (quebra a sensação de "WYSIWYG").
2. **Preview não é fiel** — `PreviewRenderer` renderiza os blocos mas o nav, footer, fontes e cores do site público (`PublicSiteRenderer`) seguem caminhos diferentes. O que você vê no editor não é o que sai no ar.
3. **Páginas novas e templates** — só Home recebe template do site escolhido. Não há biblioteca visual de templates ao criar página, nem reuso de imagens já enviadas.

## Solução: 5 mudanças cirúrgicas

### 1. Edição inline real no preview (a maior mudança)
Cada bloco no preview ganha **handles de edição contextual**:
- **Textos** (headline, subtitle, body, CTA labels, FAQ questions, stats values) viram `contentEditable` com debounce de 400 ms — clica, escreve, salva. Sem painel.
- **Imagens** (hero bg, image-text, team photos, gallery items) ganham overlay "Replace / Remove" no hover, abrindo o picker do storage.
- **Cores e padding** continuam no painel lateral (esses são "settings", não conteúdo).
- O painel lateral fica como **fallback estruturado** (listas, reorder, settings avançados), igual o Pixieset.

Implementação: criar `<EditableText>`, `<EditableImage>`, `<EditableList>` e injetá-los dentro de cada bloco do `SectionRenderer` quando `editMode={true}`.

### 2. Preview fiel ao site público
Unificar a renderização: o `PreviewRenderer` passa a usar **exatamente** o mesmo componente que renderiza o site público (`PublicSiteRenderer` / `SectionRenderer`), incluindo nav, footer, fontes (`fontFamily` do `photographer_site`), cores, e o CSS global do site. Assim "preview = produção".

### 3. Biblioteca de templates por página (modal visual)
Já existe `PageTemplatePickerModal`, mas é triggered só na criação. Vamos:
- Tornar o modal **mais visual** (thumbnails reais dos templates, não só ícones)
- Adicionar opção **"Switch template"** no menu da página (já existe label, falta ação) — substitui sections atuais
- Auto-aplicar template apropriado por **tipo de página** (About → about-1/2/3, Contact → contact-1/2, etc.) baseado no nome digitado

### 4. Galeria de imagens reutilizável (Asset Library)
Novo painel acessível via botão "Media" no header do editor:
- Lista todas as imagens do bucket `site-assets` do fotógrafo
- Upload em massa (drag-drop)
- Toda imagem nos blocos é selecionada via esse picker (em vez de upload single-shot)
- Stack: nova tabela `site_assets` (id, photographer_id, url, name, size, created_at) + componente `<MediaPicker>` reutilizado em todos os campos de imagem

### 5. Persistência confiável + feedback visual
- Auto-save por debounce em vez de "Publish manual" (Pixieset salva continuamente)
- Indicador "Saving... / Saved" no header
- Botão "Publish" passa a significar **"tornar visível ao público"** (status `published`), não "salvar"

## Arquivos novos
- `src/components/website-editor/inline/EditableText.tsx`
- `src/components/website-editor/inline/EditableImage.tsx`
- `src/components/website-editor/inline/EditableList.tsx` (FAQ, Stats, Team, Testimonials items)
- `src/components/website-editor/MediaPicker.tsx` (asset library modal)
- `src/components/website-editor/MediaLibraryButton.tsx`
- Migration: tabela `site_assets` + RLS por `photographer_id`

## Arquivos editados
- `src/components/store/SectionRenderer.tsx` — aceitar prop `editMode` e `onPropChange(sectionId, propPath, value)`; injetar componentes editáveis
- `src/components/website-editor/PreviewRenderer.tsx` — passar `editMode=true` e propagar mudanças ao state do editor
- `src/components/website-editor/BlockSettingsPanel.tsx` — focar só em settings (cor, padding, animação, variant) — conteúdo sai daqui
- `src/components/website-editor/ImageUploadField.tsx` — virar wrapper do `MediaPicker`
- `src/pages/dashboard/WebsiteEditor.tsx` — auto-save com debounce, indicador "Saving", redefinir Publish, integrar Media button

## Ordem de execução (cada etapa testável)
1. **Inline editing de textos** (EditableText em hero, text, cta, faq, stats) — ganho imediato perceptível
2. **Inline editing de imagens** + Media Picker básico (sem library, ainda upload direto)
3. **Tabela `site_assets` + Media Library** completa
4. **Preview fiel** (unificar com PublicSiteRenderer, fontes/cores/nav)
5. **Auto-save + Switch template + thumbnails do picker**

## Resultado esperado
- Clica num headline no preview → cursor aparece, digita, sai do foco, salva. Zero painel.
- Hover numa imagem → "Replace" → abre Media Library → seleciona → troca instantaneamente.
- Cria página "About Us" → modal sugere About 1/2/3 com thumbnails reais.
- Tudo o que muda no editor é exatamente como aparece no site publicado.
- Indicador "Saved" sempre visível, sem medo de perder trabalho.

