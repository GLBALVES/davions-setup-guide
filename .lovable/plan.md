
## Contexto

O usuário quer o passo a passo exato para executar na VPS agora. O container caddy-proxy já existe e responde 200 OK na porta 8080. O objetivo é recriar o container com as labels do Traefik para que o tráfego externo (porta 443) seja roteado para o Caddy.

Não há mudanças de código necessárias — tudo já está documentado em `AdminVpsSetup.tsx`. A resposta é apenas informativa: apresentar os comandos de forma clara e sequencial.

## Passo a passo para executar na VPS

### Passo 1 — Confirmar nome da rede do Traefik
```bash
docker network ls | grep -i traefik
```
Provavelmente retorna `easypanel`. Se o nome for diferente, substituir nos comandos abaixo.

### Passo 2 — Recriar container com labels do Traefik
```bash
docker stop caddy-proxy && docker rm caddy-proxy

docker run -d --name caddy-proxy \
  --restart unless-stopped \
  -p 127.0.0.1:8080:8080 \
  -v /etc/caddy/Caddyfile:/etc/caddy/Caddyfile:ro \
  --network easypanel \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.caddy-proxy.rule=HostRegexp(`{host:.+}`)" \
  --label "traefik.http.routers.caddy-proxy.entrypoints=websecure" \
  --label "traefik.http.routers.caddy-proxy.tls=true" \
  --label "traefik.http.routers.caddy-proxy.tls.certresolver=letsencrypt" \
  --label "traefik.http.routers.caddy-proxy.priority=1" \
  --label "traefik.http.services.caddy-proxy.loadbalancer.server.port=8080" \
  caddy:latest
```

### Passo 3 — Verificar labels aplicadas
```bash
docker inspect caddy-proxy | grep -A 20 '"Labels"'
```
Deve mostrar `traefik.enable=true` e as demais labels.

### Passo 4 — Testar roteamento interno (deve retornar 200)
```bash
curl -s -o /dev/null -w "%{http_code}" -H "Host: davions.giombelli.com.br" http://127.0.0.1:8080
```

### Passo 5 — Testar fluxo externo completo via HTTPS
```bash
curl -vI https://davions.giombelli.com.br 2>&1 | grep -E "< HTTP|SSL|subject|issuer"
```
Esperado: `HTTP/2 200`

Isso é puramente informativo — não há mudanças de código a fazer.
