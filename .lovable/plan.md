
## Situação atual

O container Caddy está rodando e respondendo **200 OK** internamente na porta 8080. O próximo passo é fazer o **Traefik (Easypanel)** rotear o tráfego externo das portas 80/443 para esse container.

## Problema que precisa ser resolvido

O container atual foi iniciado via `docker run` direto (fora do Easypanel), então ele **não tem as labels do Traefik** — o que significa que o Traefik não sabe que deve rotear domínios customizados para ele.

Há dois caminhos:

**Opção A — Adicionar labels ao container existente (mais rápido)**  
Recriar o container com as labels do Traefik direto no `docker run`.

**Opção B — Criar um App no Easypanel (mais correto, gerenciado)**  
Criar um serviço no painel do Easypanel com a imagem `caddy:latest`, volume e labels.

## O que vou implementar

Atualizar a constante `EASYPANEL_DOCKER_RUN` em `AdminVpsSetup.tsx` para incluir **as labels do Traefik direto no comando `docker run`**, com a regra `HostRegexp` que captura qualquer domínio customizado e o encaminha para a porta 8080:

```bash
docker stop caddy-proxy && docker rm caddy-proxy

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

**Ponto crítico**: o container precisa estar na **mesma rede Docker do Traefik** (`--network easypanel`), caso contrário o Traefik não consegue alcançá-lo mesmo com as labels.

## Plano de implementação

1. Atualizar `EASYPANEL_DOCKER_RUN` — incluir `--network easypanel` e todas as labels do Traefik no `docker run`
2. Adicionar comando de verificação pós-deploy — `docker inspect caddy-proxy | grep -A5 Labels` para confirmar labels, e `curl -vI https://davions.giombelli.com.br` para testar o fluxo completo externo
3. Adicionar nota de aviso: se o nome da rede Traefik no Easypanel for diferente de `easypanel`, usar `docker network ls` para confirmar o nome correto antes de rodar o comando
