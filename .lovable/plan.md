

# Plano: Editor Funcional Estilo Pixieset — Lacunas Restantes

## Estado Atual

O editor já tem a base certa: preview inline (sem iframe), SectionRenderer com 25+ blocos, BlockSettingsPanel com editores por tipo, add/remove/reorder, e seleção bidirecional sidebar↔preview. A estrutura funciona.

## O que falta para funcionar como o Pixieset

### 1. Upload de imagens nos blocos (prioridade alta)
Os campos de imagem nos blocos (Hero background, Image+Text, Gallery) aceitam apenas URL colada. Precisamos de botões de upload reais.
- Criar um componente `ImageUploadField` que faz upload para o bucket `site-assets` do storage
- Substituir os `<Input placeholder="https://...">` no BlockSettingsPanel por esse componente
- O componente mostra preview da imagem atual + botão de trocar/remover

### 2. Nav + Footer no preview (prioridade alta)
O `PreviewRenderer` renderiza apenas os blocos, sem o header/footer do site. No Pixieset, o preview mostra a página completa.
- Carregar dados do `photographer_site` (logo, cores, nav links) ao montar o editor
- Renderizar o nav do site acima dos blocos e o footer abaixo, dentro do PreviewRenderer
- O nav deve refletir as páginas visíveis (`inMenu: true`) da sidebar

### 3. Style tab funcional (prioridade média)
Atualmente é um placeholder. Precisa controlar:
- **Cores**: accent color, header bg, footer bg
- **Tipografia**: font family do heading e body (selecionar entre 5-8 fontes)
- **Logo**: upload do logo do site
- Salvar no `photographer_site` e refletir no preview em tempo real

### 4. Publicar funcional (prioridade média)
O botão "Publish" não faz nada. Precisa:
- Salvar todas as páginas no banco (já acontece parcialmente via `persistUpdate`)
- Mostrar toast de confirmação
- Opcionalmente, abrir o site público em nova aba

### 5. Drag-and-drop de blocos na sidebar (prioridade baixa)
Atualmente usa setas ↑↓. Adicionar drag-and-drop via `@dnd-kit/sortable` na lista de blocos do `PageSectionsPanel`.

### 6. Toolbar flutuante no preview (prioridade baixa)
No Pixieset, ao passar o mouse num bloco no preview, aparece uma mini-toolbar (mover, duplicar, deletar). O `BlockToolbar` já existe mas só é usado na sidebar. Integrar no wrapper do preview.

## Arquivos modificados

- **Novo**: `src/components/website-editor/ImageUploadField.tsx` — upload para storage
- **Editado**: `src/components/website-editor/BlockSettingsPanel.tsx` — usar ImageUploadField
- **Editado**: `src/components/website-editor/PreviewRenderer.tsx` — adicionar nav/footer + toolbar flutuante
- **Editado**: `src/pages/dashboard/WebsiteEditor.tsx` — carregar dados do site, Style tab funcional, Publish funcional

## Ordem de execução

1. ImageUploadField + integração no BlockSettingsPanel
2. Nav/Footer no preview
3. Style tab
4. Publish
5. Drag-and-drop (se houver tempo)

