

## Adicionar ícone de refresh ao lado do sino

### Alteração
Arquivo: `src/components/dashboard/DashboardHeader.tsx`

Adicionar um botão com ícone `RefreshCw` (lucide-react) logo após o `<NotificationBell />` (linha 107), com tooltip "Refresh". Ao clicar, recarrega a página (`window.location.reload()`).

- Importar `RefreshCw` de `lucide-react`
- Estilo idêntico aos outros botões do header (h-8 w-8, mesmas classes)
- Envolver em `Tooltip` como os demais

