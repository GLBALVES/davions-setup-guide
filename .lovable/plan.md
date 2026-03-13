
## Problema

`nevoxholding.com` é o domínio principal do projeto (conectado via Lovable Domains), mas `APP_HOSTNAMES` em `src/lib/custom-domain.ts` só inclui `localhost`, `lovable.app`, `lovable.dev` e `lovableproject.com`. Quando alguém acessa `nevoxholding.com`, `isCustomDomain()` retorna `true` e o app renderiza `CustomDomainStore` com "Store not found".

## Solução

Uma linha de mudança em `src/lib/custom-domain.ts`: adicionar `nevoxholding.com` diretamente na lista `APP_HOSTNAMES`.

```typescript
const APP_HOSTNAMES = [
  "localhost",
  "lovable.app",
  "lovable.dev",
  "lovableproject.com",
  "nevoxholding.com",   // ← adicionar
];
```

Isso cobre tanto `nevoxholding.com` quanto `www.nevoxholding.com` (o `endsWith` já cuida do subdomínio `www`).

### Arquivo a editar
- `src/lib/custom-domain.ts` — única mudança necessária
