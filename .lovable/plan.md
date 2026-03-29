
## Verificação completa do módulo `/admin/email`

Revisei código, banco, logs e o print. Sim: havia problemas óbvios que o sistema já deveria ter identificado antes. O diagnóstico correto agora é este:

### Problemas confirmados

1. **Texto do email está corrompido no preview/corpo**
   - O print mostra `AM=C3=89RICA`, `M=C3=89XICO` etc.
   - Isso acontece porque o sync está salvando trechos do MIME bruto / quoted-printable no `preview` e no `corpo`, em vez do conteúdo já decodificado.
   - No banco, o email mais recente tem `corpo_len > 0`, mas o `preview` ainda começa com boundary e headers MIME (`--000000... Content-Type...`), então o parser ainda está errado.

2. **Alguns emails continuam vindo sem corpo**
   - No banco, vários recebidos recentes ainda estão com `corpo_len = 0`.
   - Ou seja: o parser IMAP ainda falha em mensagens simples e multipart.

3. **SMTP “não configurado” continua aparecendo por erro de frontend**
   - No banco, a conta `partners@davions.com` já está com SMTP preenchido.
   - Mas o frontend ainda bloqueia o envio antes de chamar o servidor, checando `conta.smtp.servidor/usuario/senha` localmente.
   - Isso pode ficar desatualizado e impedir o fallback do servidor.
   - Não há logs do envio, o que reforça que em parte dos testes o bloqueio aconteceu no cliente antes de chamar a função.

4. **Ordenação e horário ainda não estão sólidos**
   - A lista ainda usa `sort` por string com `data + hora`.
   - Isso é frágil e pode quebrar ordenação/alertas.
   - O sync grava `data`/`hora` como texto, e a UI usa esses campos em vários cálculos.

5. **Renderização do corpo do email está inadequada**
   - A UI hoje faz `email.corpo.split("\n")`, tratando tudo como texto puro.
   - Para emails HTML isso gera leitura ruim; para MIME mal parseado, mostra lixo bruto.

---

## O que corrigir

### 1. Reescrever a leitura do corpo no sync IMAP
**Arquivo:** `supabase/functions/admin-sync-email/index.ts`

Ajustes:
- separar melhor headers e partes MIME
- decodificar corretamente:
  - `quoted-printable`
  - `base64`
  - `charset UTF-8`
  - multipart com preferência por `text/html`, fallback para `text/plain`
- remover boundary, headers internos e blocos MIME do conteúdo salvo
- gerar:
  - `corpo` = conteúdo limpo
  - `preview` = texto limpo sem tags/html/header técnico

Resultado esperado:
```text
preview limpo
corpo legível
sem AM=C3=89RICA
sem --000000boundary
```

### 2. Corrigir renderização do corpo no painel
**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

Ajustes:
- detectar quando o corpo é HTML válido
- renderizar HTML sanitizado / fallback para texto puro
- manter visual legível para emails simples e ricos
- evitar exibir MIME bruto como parágrafos

Resultado esperado:
```text
abrir email
→ ver mensagem real
→ não ver código MIME / encoding quebrado
```

### 3. Remover bloqueio incorreto de SMTP no cliente
**Arquivo:** `src/components/admin/AdminEmailManager.tsx`

Ajustes:
- remover o pré-bloqueio local de SMTP em `handleEnviarFromModal`
- sempre deixar o servidor validar
- mostrar ao usuário a mensagem exata retornada pelo envio
- quando falhar, marcar status real de erro em vez de voltar para “aguardando”

Resultado esperado:
```text
responder/enviar
→ chama servidor
→ usa fallback configurado no backend
→ mostra erro real se houver
```

### 4. Fortalecer validação e mensagens do envio
**Arquivo:** `supabase/functions/admin-send-email/index.ts`

Ajustes:
- revisar handshake SMTP e mensagens de erro por etapa:
  - conexão
  - auth
  - MAIL FROM
  - RCPT TO
  - DATA
- manter fallback `SMTP -> IMAP` para credenciais
- retornar erros mais objetivos para Hostinger

Resultado esperado:
```text
se falhar, o painel mostra exatamente onde falhou
```

### 5. Corrigir ordenação e base de horário
**Arquivos:**
- `src/components/admin/AdminEmailManager.tsx`
- `src/hooks/use-admin-email-data.ts`
- `supabase/functions/admin-sync-email/index.ts`

Ajustes:
- usar `created_at DESC` como ordenação principal da lista
- parar de depender de string `data + hora` para ordenar
- revisar pontos que calculam idade/notificação com `new Date(data + "T" + hora)`
- padronizar a exibição do horário recebido

Resultado esperado:
```text
último email sempre primeiro
horário consistente
notificações sem cálculo quebrado
```

### 6. Revisar textos do módulo para multi-idioma
**Arquivos do módulo/admin email**
- botão/tooltip “Refresh”
- erros SMTP/sync
- mensagens de sucesso/erro

Ajuste:
- alinhar com português/inglês/espanhol, já que o app é multi-idiomas

---

## Relatório objetivo de erros atuais

```text
1. Parser IMAP ainda salva MIME bruto em alguns emails
2. Alguns emails recebidos continuam com corpo vazio
3. Preview está usando conteúdo técnico em vez de texto limpo
4. Frontend ainda pode bloquear envio mesmo com SMTP já salvo
5. Fluxo de erro de envio marca “aguardando” em vez de erro real
6. Ordenação ainda depende de data/hora textual
7. Cálculos de tempo/notificação ainda usam data reconstruída de forma frágil
8. Corpo do email está sendo renderizado como texto simples, mesmo quando o conteúdo deveria ser HTML
```

## Arquivos a revisar nesta rodada
- `supabase/functions/admin-sync-email/index.ts`
- `supabase/functions/admin-send-email/index.ts`
- `src/components/admin/AdminEmailManager.tsx`
- `src/hooks/use-admin-email-data.ts`

## Resultado esperado após a correção
```text
/admin/email

- emails mais novos no topo
- horário consistente
- corpo legível
- acentos corretos
- sem lixo MIME no preview
- responder/enviar funcionando
- erro real exibido quando houver falha de SMTP
```
