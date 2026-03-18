
## O Problema

O valor da `SUPABASE_SERVICE_ROLE_KEY` fica **sempre oculto** no painel Lovable Cloud — é impossível visualizar pelo UI por segurança. Não existe nenhum caminho no painel para ver o valor real.

Mas há uma solução muito melhor do que tentar expor essa chave no VPS.

---

## A Solução Correta: Edge Function de Validação

Em vez de colocar a chave `service_role` no VPS (o que seria um risco de segurança), crio uma **Edge Function dedicada** chamada `validate-domain` que o Caddy chama para verificar se um domínio existe.

```text
Caddy recebe requisição para "foto.studio.com"
        ↓
Caddy pergunta: GET https://[projeto].supabase.co/functions/v1/validate-domain?domain=foto.studio.com
        ↓
Edge Function consulta o banco internamente (sem expor nenhuma chave)
        ↓
Retorna 200 (domínio existe) ou 403 (domínio não existe)
        ↓
Caddy emite ou rejeita SSL
```

**Vantagens:**
- Zero segredos no VPS — a URL pública da Edge Function já é suficiente
- Mais seguro: a chave service_role fica apenas no ambiente do backend
- Mais simples: no VPS só precisará da URL da Edge Function

---

## O que será feito

**Criar** `supabase/functions/validate-domain/index.ts` — Edge Function que:
- Recebe `?domain=` como query param
- Consulta `photographers.custom_domain` no banco
- Retorna `200 OK` se existir, `403 Forbidden` se não

**Caddyfile no VPS** ficará assim:
```text
{
    on_demand_tls {
        ask https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain={host}
        interval 2m
        burst 5
    }
}

:443 {
    tls { on_demand }
    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host {host}
    }
}

:80 {
    redir https://{host}{uri} permanent
}
```

**Nenhuma variável de ambiente necessária no VPS** além das opcionais de sistema.

---

## Comandos Completos para o VPS (Ubuntu 22.04)

Após a criação da Edge Function, os comandos para configurar o Hostinger VPS serão:

```bash
# 1. Instalar Caddy
sudo apt update
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudflare.com/cloudflare-dns.com/stable/gpg.key' \
  | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudflare.com/caddy/stable/deb/debian.deb.txt' \
  | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# 2. Configurar Caddyfile
sudo nano /etc/caddy/Caddyfile
# (colar o Caddyfile acima)

# 3. Liberar portas
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable

# 4. Reiniciar Caddy
sudo systemctl reload caddy
```

**Só isso.** Sem Node.js, sem PM2, sem variáveis de ambiente com chaves secretas.
