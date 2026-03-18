
## Email automático para o time Davions — novo domínio personalizado

### Contexto

- `RESEND_API_KEY` já está configurado como secret.
- `handleSaveDomain` em `WebsiteSettings.tsx` (linha 206) é o único ponto de salvamento de domínio personalizado pelo fotógrafo via UI.
- `CustomDomainDocs.tsx` também salva via `saveDomain()` (step 1 do wizard).
- O padrão do projeto é usar edge functions para envio de email via Resend API.

---

### O que será feito

**1. Nova edge function `notify-domain-saved`**

Recebe `{ domain, photographerName, photographerEmail }`, valida JWT do usuário, e envia um email interno para `team@davions.com` com:
- Domínio configurado
- Nome do estúdio
- Email do fotógrafo
- Timestamp
- Registros DNS necessários (calculados no backend)

**2. Chamar a função após salvar o domínio com sucesso**

Atualizar `handleSaveDomain` em `WebsiteSettings.tsx` para invocar a edge function via `supabase.functions.invoke()` logo após o update bem-sucedido — sem bloquear a UX (fire-and-forget).

**3. Idem no wizard `CustomDomainDocs.tsx`**

Atualizar `saveDomain()` da mesma forma.

---

### Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/notify-domain-saved/index.ts` | Criar |
| `src/pages/dashboard/WebsiteSettings.tsx` | Modificar `handleSaveDomain` |
| `src/pages/dashboard/CustomDomainDocs.tsx` | Modificar `saveDomain` |
| `supabase/config.toml` | Adicionar `verify_jwt = false` (valida JWT no código) |

---

### Template do email interno

```
De: Davions <noreply@davions.com>
Para: team@davions.com
Assunto: New custom domain — booking.giombelli.com.br

Um fotógrafo acabou de configurar um domínio personalizado.

Studio: Giombelli Photography
Email: contact@giombelli.com.br
Domain: booking.giombelli.com.br
Type: Subdomain
Date: 18 Mar 2026, 14:52

— DNS records to configure —
A     booking   →  185.158.133.1
TXT   _davions  →  davions_verify=booking_giombelli_com_br

Action needed: Add this domain in the Lovable project settings.
```

---

### Detalhes técnicos

A edge function usa `RESEND_API_KEY` (já disponível). Email destino hardcoded em `team@davions.com` — pode ser facilmente alterado depois.

O invoke é feito com `{ body: { ... } }` sem `await` bloqueante — a UX do fotógrafo não é afetada se o email falhar.

Nenhuma migração de banco de dados necessária.
