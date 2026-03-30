

## Corrigir `admin-send-email` para evitar SPAM

### Problemas identificados

1. **Linha 89/95:** `EHLO localhost` — servidores de email rejeitam/penalizam isso. Deve usar o domínio real do remetente.
2. **Headers faltando:** Sem `Message-ID`, sem `Return-Path`, sem `X-Mailer` — são sinais de spam para filtros.
3. **Domínio extraído dinamicamente:** Extrair domínio do `conta.email` (ex: `partners@davions.com` → `davions.com`) para usar no EHLO e no Message-ID.

### Correções no arquivo `supabase/functions/admin-send-email/index.ts`

#### 1. Extrair domínio do email do remetente (após linha 60)
```typescript
const senderDomain = conta.email.split("@")[1] || "localhost";
```

#### 2. EHLO com domínio real (linhas 89 e 95)
- `EHLO localhost` → `EHLO ${senderDomain}`

#### 3. Adicionar headers anti-spam (bloco de headers, linhas 125-133)
Adicionar antes do `Date`:
- `Message-ID: <${Date.now()}.${crypto.randomUUID()}@${senderDomain}>`
- `Return-Path: <${conta.email}>`
- `X-Mailer: Davions Mail/1.0`

### Resultado
Emails enviados terão identificação válida do domínio no handshake SMTP e headers completos, reduzindo drasticamente a chance de cair em spam.

### Nota sobre DNS
Além do código, o domínio `davions.com` precisa ter registros **SPF**, **DKIM** e **DMARC** configurados no painel DNS do Hostinger. Isso é configuração externa, não código — posso explicar os registros necessários após a correção.

