
## O Problema Real

A arquitetura atual tem uma dependência impossível de escalar:

```text
Fotógrafo salva domínio
        ↓
App salva no banco de dados
        ↓
E-mail enviado para team@davions.com
        ↓
Alguém acessa Lovable Settings → Domains → Add Domain (MANUAL)
        ↓
SSL provisioned → domínio funciona
```

O problema raiz é que o **app está hospedado pela Lovable** (IP `185.158.133.1`), e a Lovable não oferece nenhuma API para adicionar domínios programaticamente. Esse passo sempre seria manual.

---

## A Solução: Proxy Próprio (Caddy Server)

A solução definitiva é colocar um **reverse proxy intermediário** sob seu controle entre os domínios dos fotógrafos e o app Lovable. O Caddy faz provisionamento de SSL automaticamente via Let's Encrypt, sem nenhuma intervenção manual.

```text
Fotógrafo aponta domínio → SEU VPS (Caddy) → Lovable app
         A record: IP do seu VPS
         
Caddy recebe requisição, obtém SSL automaticamente,
proxeia para davions-page-builder.lovable.app
```

### Como funciona para o fotógrafo

1. Fotógrafo entra o domínio no WebsiteSettings
2. App salva no banco e exibe as instruções DNS (registro A apontando para o **IP do VPS**, não mais o IP da Lovable)
3. Caddy detecta automaticamente o novo domínio e provisiona SSL via Let's Encrypt
4. O domínio já funciona — **zero ação manual**

---

## O que será construído

### Parte 1 — Servidor Caddy (infraestrutura, ~$5-10/mês VPS)

Um servidor com o Caddy configurado para:
- Aceitar **qualquer domínio** que aponte para o VPS
- Provisionar SSL automaticamente via Let's Encrypt
- Redirecionar tráfego para `davions-page-builder.lovable.app` preservando o `Host` original (para que o app continue detectando o domínio correto)

**Arquivo `Caddyfile` no VPS:**
```
{
    on_demand_tls {
        ask http://localhost:9000/check-domain
    }
}

:443 {
    tls {
        on_demand
    }
    reverse_proxy https://davions-page-builder.lovable.app {
        header_up Host {host}
    }
}
```

**Endpoint de validação `/check-domain`** (pequeno script no VPS que consulta o banco se o domínio existe na tabela `photographers`):
```
Se photographers.custom_domain = domínio solicitado → retorna 200
Caso contrário → retorna 403 (Caddy não provisiona SSL para domínios desconhecidos)
```

### Parte 2 — Atualizar instruções DNS no app

Mudar o IP nas instruções do wizard de domínio de `185.158.133.1` para o IP do VPS.

**Arquivos a editar:**
- `src/pages/dashboard/WebsiteSettings.tsx` — instrução A record
- `supabase/functions/check-domain/index.ts` — `EXPECTED_IP`
- `supabase/functions/notify-domain-saved/index.ts` — A record no e-mail
- `src/lib/custom-domain.ts` — documentação

### Parte 3 — Simplificar o fluxo de notificação

Com o proxy automático, o e-mail de notificação ao time pode ser removido ou simplificado (não há mais "ação necessária").

---

## O que você precisará

1. **Um VPS** (DigitalOcean, Hetzner, Vultr — a partir de $4/mês) com IP fixo
2. Instalar Caddy + o script de validação de domínio no VPS
3. Atualizar o IP nas instruções do app

**Eu faço as mudanças no código do app.** A configuração do VPS/Caddy é um passo de infraestrutura fora do Lovable que você executa uma única vez.

---

## Resultado Final

| Antes | Depois |
|-------|--------|
| Fotógrafo salva domínio → você adiciona manualmente | Fotógrafo salva domínio → funciona automaticamente |
| Demora horas ou dias | SSL em minutos |
| Não escala | Escala para centenas de fotógrafos |

Quer que eu prepare as mudanças de código (Parte 2 e 3) e o script de validação do VPS?
