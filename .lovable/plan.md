
## Diagnóstico do curl

O resultado mostra que o proxy está funcionando — mas está recebendo um **302 redirect** do Cloudflare/Lovable CDN:

```
HTTP/1.1 302 Found
Location: https://davions.com/
Server: cloudflare
Via: 2.0 Caddy
```

**O que está acontecendo:**

O Caddyfile atual aponta para `davions-page-builder.lovable.app` como upstream. Porém, como o projeto tem `davions.com` configurado como domínio primário no Lovable, o Cloudflare redireciona automaticamente para `davions.com` qualquer requisição que chegue em `davions-page-builder.lovable.app`. Isso é um redirect canônico da plataforma Lovable.

**A fix:** mudar o upstream do reverse_proxy para `davions.com` (o domínio primário real). Assim o Cloudflare serve o app diretamente sem redirect, e o `X-Forwarded-Host` ainda chega ao React app com o domínio do fotógrafo.

```text
Antes: Caddy → davions-page-builder.lovable.app → 302 → davions.com  (loop/falha)
Depois: Caddy → davions.com → 200 HTML (app carregado, X-Forwarded-Host preservado)
```

---

## Mudanças no código

Apenas `AdminVpsSetup.tsx` — atualizar a constante `CADDYFILE_EASYPANEL`:

**De:**
```caddy
reverse_proxy https://davions-page-builder.lovable.app {
  header_up Host davions-page-builder.lovable.app
  transport http {
    tls_server_name davions-page-builder.lovable.app
  }
}
```

**Para:**
```caddy
reverse_proxy https://davions.com {
  header_up Host davions.com
  header_up X-Forwarded-Host {http.request.host}
  header_up X-Real-IP {remote_host}
  transport http {
    tls_server_name davions.com
  }
}
```

Também atualizar a constante `CADDYFILE` (VPS standalone) com o mesmo fix, e adicionar uma nota explicando o motivo — "Lovable redireciona `.lovable.app` para o domínio primário; usar o domínio primário diretamente evita o 302".

Também adicionar um **comando de teste corrigido** para o usuário executar agora:

```bash
# Recriar o container com a config corrigida
docker stop caddy-proxy && docker rm caddy-proxy

# Atualizar o /etc/caddy/Caddyfile com o upstream davions.com
# Depois:
docker run -d --name caddy-proxy \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  caddy:latest

# Testar novamente
curl -v -H "Host: davions.giombelli.com.br" http://127.0.0.1:8080
# Esperado: HTTP/1.1 200 OK (não mais 302)
```

---

## Plano de implementação

1. Atualizar `CADDYFILE_EASYPANEL` — mudar upstream para `davions.com`, `header_up Host davions.com`, `tls_server_name davions.com`
2. Atualizar `CADDYFILE` (standalone) com o mesmo fix
3. Adicionar nota explicativa sobre o 302 do Cloudflare no Step 8
4. Adicionar bloco com os comandos para recriar o container e testar
