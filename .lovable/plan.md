

## Refresh inteligente no módulo de email

### Problema
O botão de refresh faz `window.location.reload()` — recarrega a página inteira, piscando a tela. Deveria apenas chamar a sincronização IMAP no servidor e atualizar os emails no state.

### Correção
Arquivo: `src/components/admin/AdminEmailManager.tsx`

1. **Linha 1486**: Trocar `onClick={() => window.location.reload()}` por `onClick={handleSyncEmails}`
2. **Linha 1487**: Adicionar classe de animação condicional ao ícone: `className={cn("w-4 h-4", syncing && "animate-spin")}` — o ícone gira enquanto `syncing` é `true`
3. **Desabilitar** o botão durante sync: `disabled={syncing}`

Já existe `handleSyncEmails` (linha 706) e o state `syncing` — basta conectá-los ao botão. Zero lógica nova.

