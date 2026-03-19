
## Diagnóstico: 404 de `davions.giombelli.com.br` com SSL funcionando

### O que está acontecendo

O print mostra o erro 404 com o logo hexagonal verde-azulado — esse é **o 404 da CDN da Lovable** (não é o 404 do React app). Significa que:

1. O DNS aponta corretamente para o VPS ✓
2. O TLS/SSL foi emitido com sucesso ✓
3. O Caddy está recebendo a requisição e fazendo proxy para `davions.com` ✓
4. **A CDN da Lovable recebe o `Host: davions.com` e retorna 404** ✗

### Causa raiz

O `Host: davions.com` está sendo enviado para a CDN, mas a CDN retorna 404. Isso acontece porque **`davions.com` precisa estar configurado como domínio primário ativo no projeto Lovable** — ou seja, o projeto precisa estar **publicado** e `davions.com` precisa estar no status **Active** em Project Settings → Domains.

Se `davions.com` não está conectado/ativo no Lovable, a CDN não sabe que `Host: davions.com` mapeia para esse projeto, e retorna 404.

### Solução: usar `davions-page-builder.lovable.app` como upstream

O upstream seguro e garantido é sempre `davions-page-builder.lovable.app` — este é o identificador permanente do projeto. O problema de 302 redirect que motivou a mudança para `davions.com` só ocorre quando o `Host` header enviado para a CDN é o subdomínio `.lovable.app`. A correção é:

- Fazer proxy para `davions-page-builder.lovable.app`
- Enviar `Host: davions-page-builder.lovable.app` (para a CDN identificar o projeto)
- Preservar o custom domain original em `X-Forwarded-Host: {host}` (para o React detectar o domínio)

```caddy
{
    auto_https off
}

:80 {
    header Access-Control-Allow-Origin "*"

    header_up -X-Forwarded-For
    header_up -X-Real-IP

    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host davions-page-builder.lovable.app
        header_up X-Forwarded-Host {host}
        transport http {
            tls
            tls_server_name davions-page-builder.lovable.app
        }
    }

    handle_errors {
        rewrite * /index.html
    }
}
```

O `CADDYFILE` standalone (com On-Demand TLS) também deve usar o mesmo upstream.

### O que será alterado

**`src/pages/admin/AdminVpsSetup.tsx`**:

1. `CADDYFILE_EASYPANEL` — trocar upstream de `davions.com` para `davions-page-builder.lovable.app` com `Host: davions-page-builder.lovable.app`
2. `CADDYFILE` (standalone) — idem: upstream `davions-page-builder.lovable.app`, `Host: davions-page-builder.lovable.app`, `tls_server_name davions-page-builder.lovable.app`
3. `TROUBLESHOOT[0]` — corrigir a entrada de 404 para explicar que o upstream deve ser o `.lovable.app` com o Host correto

### Nenhuma mudança no React é necessária

O `X-Forwarded-Host` já preserva o hostname original do custom domain. O `isCustomDomain()` em `custom-domain.ts` lê `window.location.hostname` no browser — que é o custom domain real — não o header HTTP. A detecção já funciona corretamente.
