

## Relatório de Problemas Encontrados

### 1. Ordenação dos emails (último primeiro)
**Problema**: A query no `use-admin-email-data.ts` (linha 83) busca emails sem `ORDER BY`. Além disso, as listas `recebidos`, `enviados`, etc. no `AdminEmailManager.tsx` (linhas 537-540) não aplicam `.sort()`.

**Correção**:
- Em `use-admin-email-data.ts`: adicionar `.order("created_at", { ascending: false })` na query de `email_emails`
- Em `AdminEmailManager.tsx`: as listas filtradas (`filteredRecebidos`, `enviados`, etc.) devem ser ordenadas por `data` + `hora` DESC

### 2. Corpo do email vazio (não veio o texto)
**Problema**: A edge function `admin-sync-email` faz `BODY.PEEK[TEXT]` no IMAP mas **nunca extrai o conteúdo do body** da resposta. O regex na linha 119 só parseia o ENVELOPE. O campo `corpo` é sempre salvo como `""` (string vazia). Confirmado no banco: todos os emails têm `corpo_vazio: true`.

**Correção**: Reescrever o parser na edge function para extrair o body text do IMAP FETCH response e salvá-lo no campo `corpo`.

### 3. SMTP não configurado (erro ao responder)
**Problema**: A conta Hostinger tem `smtp_servidor: smtp.hostinger.com` e `smtp_porta: 465` mas **`smtp_usuario` e `smtp_senha` estão vazios** (strings vazias, não NULL). Por isso o check na linha 43 do `admin-send-email` (`!conta.smtp_usuario || !conta.smtp_senha`) retorna true e bloqueia o envio.

**Correção**: Ao salvar a conta com IMAP configurado, auto-preencher `smtp_usuario` com o mesmo valor de `imap_usuario` (e `smtp_senha` com `imap_senha`) quando estiverem vazios — já que para Hostinger geralmente são as mesmas credenciais. Além disso, mostrar um aviso visual quando SMTP está incompleto.

### 4. Horário de envio possivelmente errado
**Problema**: O `hora` é extraído do campo ENVELOPE date do IMAP que vem em UTC. O frontend salva com `parsedDate.getHours()` que converte para o timezone local do servidor (Deno edge function), não do usuário. Pode haver diferença de fuso.

**Correção**: Salvar o timestamp completo ISO no campo `data` ou usar `created_at` para exibição, e ajustar no frontend para o timezone do usuário.

---

## Plano de Correção

### Arquivos alterados

**1. `src/hooks/use-admin-email-data.ts`**
- Linha 83: adicionar `.order("created_at", { ascending: false })` na query de emails

**2. `src/components/admin/AdminEmailManager.tsx`**
- Linhas 537-540: adicionar `.sort()` por `data` + `hora` DESC nas listas de emails
- Linha 849 (handleSalvarConta): auto-copiar credenciais IMAP para SMTP quando SMTP usuario/senha estiverem vazios

**3. `supabase/functions/admin-sync-email/index.ts`**
- Reescrever o FETCH para buscar `ENVELOPE` e `BODY.PEEK[TEXT]` separadamente ou melhorar o parser
- Extrair o body text e salvar no campo `corpo` e `preview`
- Usar o timestamp ISO completo para o campo `hora`

### Resultado esperado
```
Inbox: emails mais recentes no topo
Corpo: texto do email visível ao abrir
Responder: funciona se SMTP auto-preenchido do IMAP
Horário: correto baseado no timezone do email original
```

