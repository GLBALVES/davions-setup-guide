
## Diagnóstico

A edge function `notify-domain-saved` existe e está deployada, mas **nunca é invocada** pelo frontend. As duas páginas que salvam/removem domínios (`WebsiteSettings.tsx` e `CustomDomainDocs.tsx`) fazem apenas um `supabase.update()` direto, sem chamar a edge function de notificação.

Resultado: nenhum log é gerado, nenhum e-mail é enviado para a equipe da Davions quando um domínio é configurado.

## O que vai ser feito

### `src/pages/dashboard/WebsiteSettings.tsx`

1. **`handleSaveDomain`** — após o `update()` bem-sucedido, invocar `notify-domain-saved` com `{ domain, photographerName, photographerEmail, action: "saved" }`.
2. **`handleRemoveDomain`** — após o `update(null)` bem-sucedido, invocar `notify-domain-saved` com `{ domain: domainSnapshot, photographerName, photographerEmail, action: "removed" }`.

Os dados do fotógrafo (nome, email) já estão disponíveis via `user` e os campos de estado (`fullName`).

### `src/pages/dashboard/CustomDomainDocs.tsx`

3. **`saveDomain`** — após o `update()` bem-sucedido, invocar `notify-domain-saved` com `{ domain, action: "saved" }`.

## Implementação técnica

Em ambos os arquivos, a chamada será feita com `supabase.functions.invoke("notify-domain-saved", { body: { ... } })` — sem bloquear a UX (erro na notificação não impede o fluxo do usuário, apenas loga no console).

```typescript
// Não bloqueia o fluxo — fire and forget
supabase.functions.invoke("notify-domain-saved", {
  body: {
    domain: savedDomain,
    photographerName: fullName,
    photographerEmail: user?.email,
    action: "saved",
  },
}).catch((err) => console.warn("notify-domain-saved:", err));
```

Arquivos editados: `WebsiteSettings.tsx`, `CustomDomainDocs.tsx`
