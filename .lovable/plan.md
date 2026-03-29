

## Problema

O botão de refresh foi adicionado ao `DashboardHeader.tsx`, mas a página `/admin/email` usa o `AdminLayout`, que não inclui esse header. Por isso o botão não aparece ali.

## Solução

Adicionar um header ao `AdminLayout` com o botão de refresh (e opcionalmente o sino de notificações), similar ao `DashboardHeader`.

### Alteração no arquivo `src/components/admin/AdminLayout.tsx`

1. Importar `RefreshCw` de `lucide-react` e `Tooltip`/`TooltipTrigger`/`TooltipContent`
2. Adicionar um `<header>` dentro do `<main>` com:
   - Botão de refresh com `window.location.reload()`
   - Mesmo estilo visual do DashboardHeader (`h-14 border-b`)
3. O conteúdo (`children`) fica abaixo do header

Resultado: o botão de refresh aparecerá no topo de todas as páginas admin, incluindo `/admin/email`.

