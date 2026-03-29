

## Mover seletor de provedor para fora das abas do modal

### Problema
O seletor de provedor (Gmail, Outlook, Hostinger, etc.) está dentro da aba "Geral" do modal. Quando o usuário clica em "Servidor" na lista de contas, o modal abre direto na aba "Servidor" — e o seletor de provedor fica escondido na outra aba. Por isso parece que os presets não existem.

### Solução
Mover o campo **Provedor** para o topo do modal, acima das abas, visível em ambas as views (Geral e Servidor). Assim, ao abrir o modal em qualquer aba, o usuário sempre vê e pode trocar o provedor, que preenche automaticamente os campos IMAP/SMTP.

### Alteração
Arquivo: `src/components/admin/AdminEmailManager.tsx`

1. Remover o bloco do `Select` de provedor de dentro da seção `contaModalTab === "geral"` (linhas ~1502-1527)
2. Colocar esse mesmo bloco logo após o `DialogDescription` e antes dos botões de aba (Geral/Servidor), para que fique sempre visível
3. Manter toda a lógica de presets igual — ao selecionar um provedor, IMAP/SMTP são preenchidos automaticamente

