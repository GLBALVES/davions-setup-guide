
## Diagnóstico

Verifiquei o módulo e hoje o comportamento está assim:

1. A conta está sendo salva no banco
- Há registro em `email_contas` para `partners@davions.com`.
- Então o problema principal não é mais a gravação.

2. A “área de configuração” existe, mas não aparece automaticamente após adicionar
- A lista de contas e o botão “Adicionar conta” ficam dentro da aba `config`.
- Ao salvar uma nova conta, o código apenas fecha o modal (`setModalContaAberto(false)`), mas não muda para a aba de configuração.
- Se você estiver em outra aba, parece que “nada abriu”.

3. A tela de configuração da conta está incompleta
- Existe estado para `contaModalTab` com `"geral" | "servidor"`.
- Porém o modal atual mostra só:
  - nome
  - email
  - cor
  - assinatura
  - conta padrão
- Os campos de configuração de servidor (IMAP/SMTP) não estão renderizados no modal, embora existam no estado e no banco.
- Isso explica sua percepção: faltam as funções de “configurar”.

4. Há um aviso de UI no modal
- O console mostra warning de `DialogFooter` recebendo ref indevido e também falta de descrição em `DialogContent`.
- Não parece ser a causa principal do fluxo, mas vale corrigir junto.

## O que vou ajustar

### 1) Fazer a configuração aparecer logo após adicionar
No salvar da conta nova:
- manter o salvamento
- fechar o modal
- navegar automaticamente para a aba `config`
- opcionalmente destacar/selecionar a conta recém-criada

Fluxo esperado:
```text
Adicionar conta -> Salvar -> continuar na aba Configurações
-> ver a conta criada imediatamente -> poder editar/configurar
```

### 2) Restaurar a tela completa de configuração da conta
No modal de conta, vou implementar as seções que já estão previstas pelo estado:

- Aba/segmento “Geral”
  - nome
  - email
  - cor
  - assinatura
  - conta padrão
  - provedor

- Aba/segmento “Servidor”
  - IMAP:
    - ativo
    - servidor
    - porta
    - segurança
    - usuário
    - senha
  - SMTP:
    - ativo
    - servidor
    - porta
    - segurança
    - usuário
    - senha

### 3) Usar os presets por provedor
Como já existem presets para:
- Gmail
- Outlook
- Hotmail
- Yahoo
- iCloud

Vou fazer o seletor de provedor preencher automaticamente IMAP/SMTP, sem impedir edição manual quando for `custom`.

### 4) Melhorar o fluxo de edição
Na listagem de contas da aba Configurações:
- ao clicar em editar, abrir o mesmo modal completo
- carregar todos os dados IMAP/SMTP já salvos
- permitir trocar entre “Geral” e “Servidor”

### 5) Corrigir warnings de dialog
Vou ajustar os modais para:
- usar estrutura compatível com refs
- incluir descrição acessível no `DialogContent`

## Resultado esperado depois da implementação

Quando adicionar um email:
- a conta será salva
- você verá imediatamente a área de Configurações
- a conta aparecerá na lista
- ao abrir/editar, surgirão as funções completas de configurar IMAP e SMTP

## Detalhes técnicos

Arquivos a ajustar:
- `src/components/admin/AdminEmailManager.tsx`
- possivelmente `src/components/ui/dialog.tsx` se o warning de ref vier da implementação base

Pontos específicos:
- `handleSalvarConta` deve redirecionar para `config` após criar/editar
- o modal da conta precisa renderizar os campos de `formConta.imap` e `formConta.smtp`
- `contaModalTab` atualmente existe, mas não está sendo usado visualmente
- os dados persistidos já suportam essa configuração no hook e no banco

