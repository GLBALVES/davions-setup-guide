
## Diagnóstico do 404 em Custom Domain

### O que foi verificado

1. `validate-domain?domain=davions.giombelli.com.br` → `{"registered": true}` ✅ — A edge function está OK
2. Logs de analytics: **Caddy nunca chamou `validate-domain`** — somente o meu teste manual aparece no log
3. Único domínio cadastrado: `davions.giombelli.com.br` → fotógrafo Gilberto Giombelli ✅

### Causas raiz identificadas

**Causa 1 — Caddy não está chamando `validate-domain` (on-demand TLS não ativado)**

O Caddy com Easypanel/Traefik usa `auto_https off` no `CADDYFILE_EASYPANEL`. Sem `on_demand_tls`, o Caddy nunca faz o `ask` para a edge function — o certificado é gerenciado pelo Traefik. Isso é esperado nessa configuração. O problema do 404 é **outra coisa**.

**Causa 2 — Host header errado chegando na Lovable CDN**

O Caddyfile (versão Easypanel) faz `header_up Host davions.com`. A CDN da Lovable precisa receber o Host certo para servir o projeto. Se `davions.com` não está configurado como domínio do projeto na Lovable, a CDN retorna 404.

Solução: o upstream deve usar `davions-page-builder.lovable.app` como Host (ou o domínio primário correto publicado na Lovable). O comentário no código diz para usar `davions.com` mas isso só funciona se `davions.com` estiver efetivamente conectado como domínio ativo na Lovable.

**Causa 3 — Falta de fallback SPA no Caddy**

Quando o Caddy faz proxy reverso para a Lovable, rotas como `/book/algum-slug` podem retornar 404 da CDN se a CDN não reconhece a rota. A CDN da Lovable serve o `index.html` para todas as rotas quando o domínio está configurado — mas só para o Host correto.

### O que será feito

#### 1. Adicionar log de requisições em `validate-domain`
Logar cada chamada recebida (IP, domínio, status) para confirmar se o Caddy está chegando à função. Isso transforma a edge function em uma ferramenta de diagnóstico ativa.

```typescript
// Antes de tudo:
console.log(`[validate-domain] request from ${req.headers.get("cf-connecting-ip") ?? "?"} domain="${cleanDomain}" → ${data ? "registered" : "not found"}`);
```

#### 2. Atualizar o Caddyfile da VPS Setup com a URL de host correta

O `AdminVpsSetup.tsx` exibe dois Caddyfiles. Ambos precisam ser auditados:

- **Versão standalone** (`CADDYFILE`): usa `header_up Host davions.com` → correto **somente se** `davions.com` está ativo na Lovable
- **Versão Easypanel** (`CADDYFILE_EASYPANEL`): idem

Adicionar um alerta claro na UI explicando que o Host deve ser o domínio primário publicado na Lovable (`davions.com`), e confirmar que esse domínio está ativo.

#### 3. Adicionar teste de proxy direto na ferramenta de diagnóstico

Expandir o "Live DNS Diagnostic" para incluir um segundo teste: chamar `check-domain` para verificar se o A record aponta para o VPS, e adicionar um terceiro passo que testa diretamente se a rota raiz do domínio customizado retorna 200 (via `fetch` com headers corretos simulando o proxy).

#### 4. Corrigir entrada de troubleshooting inconsistente

A entrada "404 on custom domain even though validate-domain returns 200" (linha 211) menciona `davions-page-builder.lovable.app` mas o Caddyfile usa `davions.com`. Corrigir para ser consistente.

---

### Arquivos a serem alterados

- **`supabase/functions/validate-domain/index.ts`** — adicionar logging detalhado de cada request
- **`src/pages/admin/AdminVpsSetup.tsx`** — corrigir inconsistência no troubleshooting, adicionar alerta sobre host correto, melhorar a ferramenta de diagnóstico com teste de conectividade end-to-end

### Resultado esperado

Com logs na `validate-domain`, será possível confirmar imediatamente se o Caddy está ou não chegando à função. A documentação corrigida vai guiar o setup correto do Caddyfile.
