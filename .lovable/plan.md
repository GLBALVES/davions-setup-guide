

## Problema

O botão "Enviar" no ComposeModal chama `onSend` que no `AdminEmailManager` é `handleEnviarFromModal` — que apenas fecha o modal e mostra um toast. Não faz nada:

1. Não salva o email na tabela `email_emails` com `tipo: "enviado"`
2. Não adiciona ao state local `emails`
3. Não envia de fato via SMTP (não há edge function para isso)

## Solução

### 1. Alterar ComposeModal para passar os dados do email ao enviar

Mudar `onSend: () => void` para `onSend: (data: { para: string[]; cc: string[]; cco: string[]; assunto: string; corpo: string; contaId: string }) => void`. No clique do botão Enviar, chamar `onSend` passando os valores atuais dos campos.

### 2. Alterar `handleEnviarFromModal` no AdminEmailManager

Receber os dados do email e:
- Criar um objeto `EmailEnviado` com `tipo: "enviado"`, `status: "entregue"`, dados do remetente (da conta ativa), destinatário, assunto, corpo, data/hora atual
- Adicionar ao state local `setEmails(prev => [novoEmail, ...prev])`
- Chamar `persistEmailInsert(novoEmail)` para salvar no banco
- Fechar o modal e mostrar o toast

### 3. Envio real via SMTP (futuro)

O envio real via SMTP requer uma edge function que se conecte ao servidor SMTP configurado na conta. Por ora, o email será salvo como "enviado" no sistema. Posso criar essa edge function depois se necessário.

### Arquivos alterados
- `src/components/admin/AdminComposeModal.tsx` — tipar e passar dados no `onSend`
- `src/components/admin/AdminEmailManager.tsx` — receber dados, persistir e adicionar ao state

