

## Mostrar apenas o template atual com botão "Alterar" ao hover

### Ideia
Em vez de exibir o grid com os 9 templates sempre visível, mostrar apenas o card do template selecionado. Ao fazer hover no card, aparece um botão "Alterar". Ao clicar, abre o grid completo (ou um modal) para escolher outro template.

### Implementação

**Arquivo: `src/pages/dashboard/WebsiteSettings.tsx`** (seção Template, linhas ~909-928)

1. Adicionar estado `showTemplateGrid` (default `false`)
2. Quando `showTemplateGrid === false`:
   - Renderizar apenas o `TemplatePreviewCard` do template atual (`siteTemplate`)
   - No hover do card, exibir overlay com botão "Alterar template"
   - O clique no botão seta `showTemplateGrid = true`
3. Quando `showTemplateGrid === true`:
   - Mostrar o grid 3-col com todos os 9 templates (como está hoje)
   - Ao selecionar um template, setar `siteTemplate` e voltar `showTemplateGrid = false`

### Detalhe visual
- O card atual ocupa largura maior (ex: `max-w-xs`) quando sozinho, com aspecto mais destacado
- O overlay de hover usa `bg-background/60 backdrop-blur` com botão centralizado "Alterar" (estilo outline)
- Transição suave com AnimatePresence (já importado no arquivo)

