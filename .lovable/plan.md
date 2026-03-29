
## Revisão atenta: por que ainda não resolveu

Encontrei 3 causas objetivas no código e no banco:

### 1. SMTP continua quebrado porque a conta já salva segue sem credenciais SMTP
No banco, a conta ativa `partners@davions.com` está assim:
```text
IMAP: configurado
SMTP servidor: smtp.hostinger.com
SMTP usuário: vazio
SMTP senha: vazia
```
O auto-preenchimento foi colocado apenas em `handleSalvarConta`, ou seja: só funciona quando a conta é salva de novo. A conta existente continua incompleta, então responder/enviar ainda falha.

### 2. O horário ainda está errado por causa da origem do valor
Hoje o sistema usa `data` + `hora` como texto, e o recebimento IMAP grava:
```text
data = parsedDate.toISOString().slice(0,10)
hora = parsedDate.getHours():getMinutes()
```
Isso mistura UTC/ambiente do servidor com exibição local. O resultado é horário inconsistente e comparações erradas.

### 3. O corpo do email segue vazio porque o parser IMAP ainda é frágil
No banco, os emails recebidos recentes continuam com:
```text
corpo_len = 0
```
Então a alteração anterior não resolveu o parse real do `BODY.PEEK[TEXT]`. O fetch atual ainda depende de regex/split frágeis para respostas IMAP multipart/literal.

## O que vou corrigir

### A. Corrigir SMTP de verdade
Arquivos:
- `src/components/admin/AdminEmailManager.tsx`
- `supabase/functions/admin-send-email/index.ts`

Ajustes:
1. No frontend, ao detectar conta com SMTP incompleto mas IMAP completo, mostrar aviso claro no modal/compose.
2. Ao salvar conta, além de copiar usuário/senha, copiar também SMTP completo do preset quando faltar.
3. No envio, antes de bloquear, aplicar fallback seguro:
   - `smtp_usuario || imap_usuario`
   - `smtp_senha || imap_senha`
4. Melhorar a mensagem de erro retornada pelo envio para mostrar exatamente o campo faltante.
5. Marcar email enviado com status de erro real, não “aguardando”, quando o SMTP falhar.

### B. Corrigir horário com base consistente
Arquivos:
- `supabase/functions/admin-sync-email/index.ts`
- `src/components/admin/AdminEmailManager.tsx`
- possivelmente `src/hooks/use-admin-email-data.ts`

Ajustes:
1. Parar de confiar em `hora`/`data` textuais para ordenação principal.
2. Usar `created_at` como critério de ordenação no app para garantir “último primeiro”.
3. Para emails recebidos, armazenar `hora` em formato estável derivado do timestamp do email sem conversão ambígua.
4. Na UI, formatar a exibição a partir de um timestamp consistente, mantendo o padrão 12h/AM-PM do app.
5. Revisar todos os pontos que fazem `new Date(e.data + "T" + e.hora)` para não reconstruir datas quebradas.

### C. Reescrever o parse do corpo IMAP
Arquivo:
- `supabase/functions/admin-sync-email/index.ts`

Ajustes:
1. Separar melhor leitura de cabeçalho e corpo.
2. Trocar a extração baseada em regex ampla por parse orientado a literais IMAP.
3. Capturar corretamente respostas com:
   - plain text
   - HTML
   - quoted-printable
   - base64
   - multipart
4. Preencher:
   - `corpo` com conteúdo útil
   - `preview` com texto limpo
5. Manter fallback quando vier só HTML ou só plain text.

## Resultado esperado após a correção
```text
/admin/email

- Emails ordenados do mais recente para o mais antigo
- Horário exibido corretamente
- Corpo do email aparece ao abrir
- Responder/enviar usa fallback IMAP→SMTP quando necessário
- Erro de SMTP fica claro e específico, não genérico
```

## Relatório de erros atual
```text
1. SMTP não resolvido:
   conta partners@davions.com está com smtp_usuario vazio e smtp_senha vazia no banco

2. Horário não resolvido:
   sync usa data/hora textuais derivadas de parsedDate com conversão inconsistente

3. Corpo não resolvido:
   emails recebidos recentes ainda estão com corpo_len = 0 no banco
```

## Arquivos que precisam ser revisados nesta rodada
- `src/components/admin/AdminEmailManager.tsx`
- `src/hooks/use-admin-email-data.ts`
- `supabase/functions/admin-sync-email/index.ts`
- `supabase/functions/admin-send-email/index.ts`

## Observação importante
O warning de `ref` no `ComposeModal` existe, mas não é a causa principal desses 3 problemas. Posso corrigi-lo depois, separado, para não misturar com a revisão de email.
