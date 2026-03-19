
## Situação atual no VPS

O container Caddy já está respondendo **200 OK** na porta 8080. Falta apenas uma coisa: **recriar o container com as labels do Traefik e na rede correta**, para que o Traefik passe a rotear tráfego externo (porta 443) para o Caddy.

---

## O que você precisa fazer na VPS agora

### Passo 1 — Confirmar o nome da rede do Traefik
```bash
docker network ls | grep -i traefik
```
O nome provavelmente é `easypanel`. Se for diferente, substitua nos comandos abaixo.

---

### Passo 2 — Recriar o container com as labels do Traefik
```bash
# Para e remove o container atual (sem as labels)
docker stop caddy-proxy && docker rm caddy-proxy

# Recria com labels Traefik + rede correta
docker run -d --name caddy-proxy \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  --network easypanel \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.caddy-proxy.rule=HostRegexp(\`{host:.+}\`)" \
  --label "traefik.http.routers.caddy-proxy.entrypoints=websecure" \
  --label "traefik.http.routers.caddy-proxy.tls=true" \
  --label "traefik.http.routers.caddy-proxy.tls.certresolver=letsencrypt" \
  --label "traefik.http.routers.caddy-proxy.priority=1" \
  --label "traefik.http.services.caddy-proxy.loadbalancer.server.port=8080" \
  caddy:latest
```

---

### Passo 3 — Verificar que as labels foram aplicadas
```bash
docker inspect caddy-proxy | grep -A 20 '"Labels"'
```
Deve mostrar `traefik.enable=true` e as demais labels.

---

### Passo 4 — Testar o fluxo externo completo
```bash
# DNS já deve estar propagado para o IP da VPS
curl -s -o /dev/null -w "%{http_code}" -H "Host: davions.giombelli.com.br" http://127.0.0.1:8080
# Esperado: 200

# Teste externo via HTTPS (após DNS propagar)
curl -vI https://davions.giombelli.com.br 2>&1 | grep -E "< HTTP|SSL|subject"
# Esperado: HTTP/2 200
```

---

## Resumo

| O que estava faltando | O que esse passo resolve |
|---|---|
| Container sem labels do Traefik | Traefik passa a reconhecer o container |
| Container fora da rede `easypanel` | Traefik consegue alcançar o Caddy internamente |
| TLS externo sem certificado | Traefik emite Let's Encrypt automaticamente |

Depois desses passos, qualquer domínio de fotógrafo com o A record apontando para o IP da VPS será automaticamente servido com HTTPS — sem nenhuma configuração manual extra.

Não há mudanças de código necessárias — tudo já está implementado no app e na Edge Function `validate-domain`.
