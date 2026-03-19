
## Diagnóstico

O servidor já tem **Easypanel** instalado, que usa **Traefik** como proxy reverso principal. Traefik ocupa as portas 80 e 443 — por isso o Caddy não consegue iniciar. Parar o Traefik derrubaria o próprio Easypanel.

**Solução correta**: não usar Caddy standalone. Em vez disso, rodar Caddy como um serviço Docker dentro do Easypanel, em porta interna (ex: 8080), com Traefik roteando o tráfego de domínios customizados para ele.

```text
Visitante → domínio.com.br:443
  → Traefik (gerenciado pelo Easypanel, porta 443)
  → Caddy container (porta interna 8080, On-Demand TLS desativado)
  → davions-page-builder.lovable.app (Host reescrito)
```

Nesse modelo, o Traefik cuida do TLS para o wildcard e repassa para o Caddy interno, que faz o proxy reverso para a Lovable com o `Host` correto. O `on_demand_tls` do Caddy não é necessário nessa arquitetura — o Traefik/Easypanel gerencia os certificados.

---

## O que mudar no código

Apenas `AdminVpsSetup.tsx` — adicionar uma seção nova "Easypanel / Traefik Conflict" após o step 7 (Troubleshooting), com:

1. Explicação do conflito de portas com Traefik
2. Caddyfile adaptado sem TLS (Traefik cuida dos certs)
3. Comando `docker run` para subir o Caddy na porta 8080
4. Como configurar no Easypanel: criar um serviço com `Source: Docker Image = caddy`, porta 8080, e adicionar os domínios wildcard no painel
5. Adicionar entrada no `TROUBLESHOOT`: `"Caddy fails: port 80/443 already in use by docker-proxy"` com a solução Easypanel

---

## Caddyfile adaptado para uso atrás do Traefik

```caddy
{
  # No on_demand_tls — Traefik handles TLS termination
  auto_https off
}

:8080 {
  reverse_proxy https://davions-page-builder.lovable.app {
    header_up Host davions-page-builder.lovable.app
    header_up X-Forwarded-Host {http.request.host}
    header_up X-Real-IP {remote_host}
    transport http {
      tls_server_name davions-page-builder.lovable.app
    }
  }
}
```

---

## Plano de implementação

1. Adicionar constante `CADDYFILE_EASYPANEL` e `EASYPANEL_DOCKER_RUN` em `AdminVpsSetup.tsx`
2. Adicionar `Section step={8}` com título "Easypanel / Traefik — Running Caddy as a Docker Service"
3. Explicar o conflito, mostrar o Caddyfile adaptado e o docker run
4. Adicionar entrada ao array `TROUBLESHOOT` para o conflito de porta com `docker-proxy`

Nenhuma migração de banco necessária. Apenas documentação.
