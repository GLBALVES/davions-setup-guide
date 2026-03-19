
## Diagnóstico

O output do usuário mostra:

```
Valid configuration
caddy.service is not active, cannot reload.
```

**Dois problemas distintos:**

1. **WARN `header_up X-Forwarded-Host` desnecessário** — o Caddy já passa headers ao upstream por padrão. Não é erro, só warning — pode ser removido ou mantido (não impede funcionamento).

2. **`caddy.service is not active, cannot reload`** — O Caddy **NÃO está rodando como serviço systemd**. Está rodando como container Docker (`docker restart caddy-proxy` que o próprio usuário rodou antes). O `systemctl reload caddy` não tem efeito nesse cenário.

O template `CADDY_RELOAD` na página `/admin/vps-setup` ainda mostra `sudo systemctl reload caddy`, que é o comando **errado** para o ambiente Easypanel/Docker.

## Fix

Atualizar a constante `CADDY_RELOAD` no `AdminVpsSetup.tsx` para incluir **os dois cenários** — Standalone (systemctl) e Docker (docker restart):

### Novo conteúdo do bloco "Reload & verify":

```bash
# ── Standalone Caddy (systemd) ──────────────────────────
# Validate syntax
sudo caddy validate --config /etc/caddy/Caddyfile

# Reload without downtime
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy

# ── Easypanel / Docker ────────────────────────────────────
# After editing /etc/caddy/Caddyfile, restart the container:
docker restart caddy-proxy

# Tail logs to confirm it started cleanly
docker logs caddy-proxy --tail 30
```

Também adicionar uma nota explicativa acima do bloco de código, informando que `systemctl reload caddy` só funciona em instalações standalone (não Docker).

## Arquivo a alterar

- `src/pages/admin/AdminVpsSetup.tsx` — constante `CADDY_RELOAD` (linha 121–128) e o parágrafo explicativo na Section step 3.
