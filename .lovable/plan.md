
## Contexto

O código já está preparado para usar um VPS como proxy — a variável `VITE_VPS_IP` já existe, e a instrução "SSL is provisioned automatically" já está no wizard. O que falta é:

1. Configurar o VPS Hostinger com Caddy
2. Definir o `VITE_VPS_IP` e `VPS_IP` no projeto

---

## Pré-requisitos

Você precisa de um **Hostinger VPS KVM** (não compartilhado). Planos compatíveis: KVM 1, KVM 2, etc. O plano precisa de Ubuntu 22.04 e acesso SSH root.

---

## Passo a Passo Completo

### Passo 1 — Acessar o VPS via SSH

No painel Hostinger, copie o IP do VPS e a senha root. No terminal:

```text
ssh root@SEU_IP_DO_VPS
```

---

### Passo 2 — Instalar Caddy

```text
sudo apt update && sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudflare.com/cloudflare-dns.com/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudflare.com/caddy/stable/deb/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy
```

_(A forma mais simples e confiável no Ubuntu 22.04 é via repositório oficial do Caddy)_

---

### Passo 3 — Criar o script de validação de domínio

Este é o "porteiro": o Caddy pergunta "posso emitir SSL para este domínio?" antes de aceitar qualquer requisição. O script consulta o banco e responde 200 (sim) ou 403 (não).

Criar o arquivo `/opt/domain-checker/server.js`:

```js
import http from "http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const server = http.createServer(async (req, res) => {
  const domain = new URL(req.url, "http://localhost").searchParams.get("domain");
  if (!domain) { res.writeHead(400); res.end(); return; }

  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/photographers?custom_domain=eq.${encodeURIComponent(domain)}&select=id&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
  );
  const data = await r.json();
  if (Array.isArray(data) && data.length > 0) {
    res.writeHead(200); res.end("ok");
  } else {
    res.writeHead(403); res.end("not found");
  }
});

server.listen(9000, "127.0.0.1", () => console.log("Domain checker on :9000"));
```

Rodar com `node --experimental-vm-modules` ou via **PM2** (instalado com `npm install -g pm2`).

---

### Passo 4 — Configurar o Caddyfile

Substituir o conteúdo de `/etc/caddy/Caddyfile`:

```text
{
    on_demand_tls {
        ask http://localhost:9000/check?domain={host}
        interval 2m
        burst 5
    }
}

:443 {
    tls {
        on_demand
    }
    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
}

:80 {
    redir https://{host}{uri} permanent
}
```

Reiniciar: `sudo systemctl reload caddy`

---

### Passo 5 — Liberar as portas no firewall

```text
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

---

### Passo 6 — Configurar as variáveis no app

Após ter o IP do VPS (visível no painel Hostinger), **farei as seguintes mudanças no código**:

**`VITE_VPS_IP`** — variável de ambiente com o IP do VPS. As instruções DNS no WebsiteSettings já lêem esta variável e mostrarão o IP correto automaticamente.

**`VPS_IP` (secret no backend)** — a Edge Function `check-domain` já lê `Deno.env.get("VPS_IP")` para validar o registro A.

Também atualizarei:
- `src/pages/dashboard/CustomDomainDocs.tsx` — substituir as ocorrências hardcoded de `185.158.133.1` pelo IP do VPS
- `src/pages/admin/AdminDomains.tsx` — mesma correção
- `supabase/functions/notify-domain-saved/index.ts` — atualizar o IP nos e-mails e remover "Action needed: add domain to Lovable manually" (agora é automático)
- `supabase/functions/help-assistant/index.ts` — atualizar referência ao IP

---

## Fluxo Final

```text
Fotógrafo salva domínio
        ↓
App mostra: "Adicione registro A → SEU_IP_VPS"
        ↓
Fotógrafo aponta DNS no registrador (Hostinger, Registro.br, etc.)
        ↓
Caddy recebe requisição → pergunta ao script: "existe este domínio?"
        ↓
Script consulta banco → retorna 200 se sim
        ↓
Caddy emite SSL via Let's Encrypt automaticamente
        ↓
Caddy faz proxy para davions-page-builder.lovable.app
        ↓
App detecta o hostname e carrega a loja correta ✓
```

**Zero ação manual. Funciona para todos os fotógrafos.**

---

## O que você precisa me fornecer

**Apenas o IP do VPS** após a criação no Hostinger (parece com `185.XXX.XXX.XXX`). Com isso, faço todas as mudanças de código necessárias de uma vez.

Você já tem um VPS criado na Hostinger ou precisa criar um?
