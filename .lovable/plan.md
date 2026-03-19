
## Objetivo

O usuário quer o Caddyfile corrigido com:
1. `header Access-Control-Allow-Origin "*"` adicionado dentro do bloco `:80`
2. Manter a estrutura exata que ele forneceu

O Caddyfile que ele enviou usa `auto_https off` e faz proxy para `davions-page-builder.lovable.app` — mas conforme a documentação interna (memory), **o upstream correto é `davions.com`** e não `davions-page-builder.lovable.app` (a Lovable CDN faz redirect 302 de `.lovable.app` para o domínio primário, quebrando o proxy).

Vou:
- Corrigir o upstream para `davions.com`
- Adicionar `header Access-Control-Allow-Origin "*"` dentro do bloco `:80`
- Atualizar o `CADDYFILE_EASYPANEL` em `AdminVpsSetup.tsx` com este template corrigido

## Mudança

**`src/pages/admin/AdminVpsSetup.tsx`** — atualizar a constante `CADDYFILE_EASYPANEL` com o template corrigido do usuário, aplicando:
1. `header Access-Control-Allow-Origin "*"` dentro do bloco `:80`
2. Upstream corrigido de `davions-page-builder.lovable.app` → `davions.com`
3. `header_up Host davions.com` e `tls_server_name davions.com`

Caddyfile corrigido:
```caddy
{
    auto_https off
}

:80 {
    header Access-Control-Allow-Origin "*"

    # Remove headers that may confuse the CDN
    header_up -X-Forwarded-For
    header_up -X-Real-IP

    reverse_proxy https://davions.com {
        # Host MUST be the primary Lovable domain (not .lovable.app — causes 302 redirect loop)
        header_up Host davions.com
        # Preserve original custom domain for React custom domain detection
        header_up X-Forwarded-Host {host}
        transport http {
            tls
            tls_server_name davions.com
        }
    }

    handle_errors {
        rewrite * /index.html
    }
}
```

### Arquivo alterado
- `src/pages/admin/AdminVpsSetup.tsx` — atualizar `CADDYFILE_EASYPANEL`
