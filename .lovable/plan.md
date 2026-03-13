
## Adicionar Plugin DavionsConnect para Download Real

### O que fazer
O usuário fez upload de `DavionsConnect-1.0.lrplugin.zip`. Preciso:

1. **Copiar o arquivo** para `public/downloads/DavionsConnect-1.0.lrplugin.zip` — pasta `public` é ideal pois o arquivo será referenciado como URL direta para download, não importado como módulo ES6.

2. **Atualizar `LightroomPlugin.tsx`**: 
   - Trocar o `href="#download-placeholder"` por `/downloads/DavionsConnect-1.0.lrplugin.zip`
   - Adicionar atributo `download="DavionsConnect-1.0.lrplugin.zip"` para forçar o download
   - Remover o `onClick` com `toast.info("coming soon")`
   - Atualizar o nome exibido de `davions.lrplugin` para `DavionsConnect-1.0.lrplugin`

### Arquivos alterados
- `public/downloads/DavionsConnect-1.0.lrplugin.zip` (copiado do upload)
- `src/pages/dashboard/LightroomPlugin.tsx` (link de download atualizado)
