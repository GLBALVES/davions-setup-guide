
## Diagnóstico do 404 em davions.giombelli.com.br

### O que os logs mostram

**validate-domain** → retorna `200` com `{ registered: true }` ✅
Isso significa que:
1. O DNS está apontando corretamente para o VPS (Caddy recebeu a requisição)
2. O Caddy consultou o `validate-domain` e recebeu aprovação para emitir TLS
3. O certificado SSL foi ou está sendo emitido

**O 404 não vem do app React** — o app nunca chegou a ser carregado. O 404 está sendo retornado pelo Caddy/proxy antes mesmo do React ser servido.

### Causa raiz

O Caddyfile está configurado para fazer proxy reverso para o CDN da Lovable (`davions-page-builder.lovable.app`). O CDN da Lovable, ao receber a requisição, tenta localizar o projeto pelo header `Host`. Se o `Host` header chegando for `davions.giombelli.com.br` e o CDN não reconhecer esse host, ele retorna **404**.

Isso acontece porque o CDN da Lovable só serve conteúdo para os domínios publicados associados ao projeto. O domínio personalizado `davions.giombelli.com.br` **não está registrado como domínio publicado na Lovable** — ele é apenas um domínio que o usuário cadastrou internamente no sistema.

### Fluxo atual (com falha)

```text
Visitante → davions.giombelli.com.br
  → Caddy VPS (TLS ok, validate-domain 200 ✅)
  → proxy_pass para davions-page-builder.lovable.app
  → CDN Lovable recebe Host: davions.giombelli.com.br
  → CDN não reconhece esse domínio → 404 ❌
```

### Solução correta

O Caddyfile precisa reescrever o header `Host` para o host do projeto Lovable **e** passar o hostname original em um header separado (ex: `X-Forwarded-Host`) para que o app React possa identificar o domínio customizado.

```
davions.giombelli.com.br {
  reverse_proxy https://davions-page-builder.lovable.app {
    header_up Host davions-page-builder.lovable.app
    header_up X-Forwarded-Host {host}
  }
}
```

Desta forma:
- O CDN Lovable reconhece o host e serve o app ✅
- O app React recebe `X-Forwarded-Host: davions.giombelli.com.br` e `isCustomDomain()` funciona ✅

**Porém**: `window.location.hostname` no browser será `davions.giombelli.com.br` (o navegador vê o domínio real), então `isCustomDomain()` no frontend já funciona corretamente. O problema real é só o proxy não conseguir fazer o CDN servir o conteúdo.

### O que precisa ser corrigido

**No Caddyfile do VPS** (não é uma mudança no código do app):

O bloco do Caddy para domínios customizados precisa usar `header_up Host davions-page-builder.lovable.app` para que o CDN da Lovable sirva o app.

**Atualizar a página `/admin/vps-setup`** com o Caddyfile correto que inclui essa instrução, e também atualizar a documentação do wizard de domínio personalizado para que todos os fotógrafos que configurarem domínios no futuro tenham o Caddyfile correto.

### Plano de implementação

1. **Atualizar `AdminVpsSetup.tsx`** — Caddyfile mostrado na documentação deve incluir `header_up Host davions-page-builder.lovable.app` no bloco de domínios customizados.

2. **Atualizar `WebsiteSettings.tsx` / `CustomDomainDocs.tsx`** — Instruções do wizard exibidas ao fotógrafo devem mostrar o Caddyfile correto.

Nenhuma migração de banco de dados necessária. Nenhuma mudança no código React do frontend. É puramente uma correção da configuração do proxy reverso Caddy.
