
## Diagnóstico

Eu sei qual é o problema.

Hoje o módulo de Email do Admin Panel não está conectado a um fluxo real de envio/recebimento.

### O que verifiquei
1. O email foi salvo no banco
- Existe registro em `email_emails` com `tipo = enviado`.
- A requisição de insert retornou `201`.
- Então a parte de “gravar em enviados” já funcionou no banco.

2. O envio externo não existe de verdade nesse módulo
- `handleEnviarFromModal` em `src/components/admin/AdminEmailManager.tsx`:
  - cria o objeto do email
  - faz `persistEmailInsert`
  - fecha o modal
  - mostra toast
- Mas não chama nenhuma função de backend para entregar o email.
- Ou seja: o sistema marca como `status: "entregue"` sem ter enviado nada.

3. O recebimento também não existe
- O hook `useAdminEmailData` só lê a tabela `email_emails`.
- Não há integração ativa que conecte IMAP da conta e baixe mensagens do servidor.
- Então “não está vindo email” porque hoje não existe sincronização de caixa de entrada.

4. A conta Hostinger está incompleta para SMTP
No banco, a conta salva está assim:
```text
smtp_servidor: smtp.hostinger.com
smtp_porta: 465
smtp_seguranca: ssl
smtp_usuario: ""
smtp_senha: ""
```
- IMAP tem usuário/senha preenchidos.
- SMTP não tem credenciais completas.
- Mesmo se eu ligar o envio real, essa conta ainda precisará de SMTP usuário/senha válidos.

5. Existe uma função `send-client-email`, mas ela não é usada por esse módulo
- Ela serve outro fluxo do sistema.
- O Admin Email não chama essa função.

## Problema real

O módulo atual é um “gerenciador visual + banco local”, não um cliente de email funcional.

Hoje ele:
- salva emails enviados na tabela
- lê emails da tabela
- mostra UI de configuração IMAP/SMTP

Mas não faz:
- envio real via SMTP
- sincronização de entrada via IMAP
- atualização real de status de entrega

## Plano de correção

### 1. Corrigir o status falso de envio
Em vez de salvar como `entregue` imediatamente:
- salvar como `aguardando` antes do envio real
- só mudar para `entregue` se o backend confirmar sucesso
- em erro, marcar como falha e mostrar mensagem clara

### 2. Implementar envio real do módulo
Criar uma função de backend específica para o Admin Email que:
- receba `contaId`, destinatários, assunto e corpo
- busque a conta `email_contas` do usuário autenticado
- valide se SMTP está configurado
- envie o email usando as credenciais da conta
- retorne sucesso/erro detalhado

### 3. Ligar o compose ao backend de envio
Ajustar `handleEnviarFromModal` para:
- inserir o email no estado/UI como pendente
- chamar a função de backend
- atualizar o registro para sucesso ou erro conforme retorno
- manter o item em “Enviados” com status real

### 4. Implementar recebimento via IMAP
Adicionar uma função/backend para sincronização da caixa:
- conectar no IMAP com os dados da conta
- ler mensagens da inbox
- transformar em registros `email_emails` com `tipo = recebido`
- evitar duplicatas
- trazer novas mensagens sob demanda ou por sincronização manual

### 5. Ajustar a UI para refletir o fluxo real
No Admin Email:
- adicionar botão “Sincronizar”
- mostrar status real: pendente, enviado, erro
- bloquear envio se SMTP usuário/senha estiverem vazios
- exibir aviso de configuração incompleta da conta

## Arquivos a ajustar

- `src/components/admin/AdminEmailManager.tsx`
- `src/hooks/use-admin-email-data.ts`
- nova função de backend para envio do módulo de email
- nova função de backend para sincronização IMAP

## Detalhes técnicos

### Estado atual confirmado
```text
Persistência em enviados: funciona
Envio externo: não existe neste módulo
Recebimento IMAP: não existe neste módulo
Configuração Hostinger SMTP: incompleta
```

### Observação importante
Há um warning de `ref` no console dentro do Admin Email, mas isso não é a causa de emails não irem nem virem. O problema principal é ausência de integração real de transporte/sincronização.

### Resultado esperado após a correção
```text
Compor email
→ salvar como pendente
→ enviar via SMTP real
→ atualizar status para enviado ou erro

Sincronizar inbox
→ ler IMAP da conta
→ importar novas mensagens
→ exibir na aba Entrada
```
