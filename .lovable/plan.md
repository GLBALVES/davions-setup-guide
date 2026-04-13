

## Limpar página Creative Studio → Coming Soon

### O que será feito

1. **Substituir `CreativeStudio.tsx`** por uma página placeholder idêntica ao padrão do `BlogManager.tsx` — layout com sidebar, header e mensagem "Creative Studio — Coming soon" centralizada com ícone.

2. **Remover todos os componentes da pasta `src/components/dashboard/creative/`** (14 arquivos):
   - CreativeAIPanel, CreativeCanvas, CreativeImageBank, CreativePostsList, CreativeTemplateList, CreativeThemeGenerator, FooterEditorModal, FooterTemplateEditor, IconLibrary, PublishSocialModal, UnsavedChangesModal, BrandAssetsLibrary, creative-types.ts, footer-constants.ts

3. **Limpar imports órfãos** — verificar se algum outro arquivo importa componentes dessa pasta e ajustar se necessário.

### Arquivos
- `src/pages/dashboard/CreativeStudio.tsx` — reescrever (placeholder)
- `src/components/dashboard/creative/*` — deletar (14 arquivos)

