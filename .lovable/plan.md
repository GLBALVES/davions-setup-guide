
## Diagnóstico

O Caddyfile que o usuário copiou foi o `CADDYFILE_EASYPANEL` da página `/admin/vps-setup`. O erro é:

```
/etc/caddy/Caddyfile:8: unrecognized directive: header_up
```

Linha 8 no template atual é:
```caddy
    header_up -X-Forwarded-For   ← ERRADO: está solto dentro do bloco :80, fora do reverse_proxy
```

`header_up` é uma sub-diretiva do `reverse_proxy` — não pode ser usada diretamente no site block (`:80 {}`). Precisa estar **dentro** do bloco `reverse_proxy {}`.

## Fix

Mover as diretivas `header_up -X-Forwarded-For` e `header_up -X-Real-IP` para dentro do bloco `reverse_proxy {}` no `CADDYFILE_EASYPANEL`.

### Caddyfile corrigido (Easypanel / Docker):

```caddy
{
    auto_https off
}

:80 {
    header Access-Control-Allow-Origin "*"

    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host davions-page-builder.lovable.app
        header_up X-Forwarded-Host {host}
        header_up -X-Forwarded-For
        header_up -X-Real-IP
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

## Arquivo a alterar

- `src/pages/admin/AdminVpsSetup.tsx` — corrigir a constante `CADDYFILE_EASYPANEL` movendo `header_up -X-Forwarded-For` e `header_up -X-Real-IP` para dentro do bloco `reverse_proxy {}`.
