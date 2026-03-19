
## Diagnóstico do erro 404 em davions.nevoxholding.com

### O que está acontecendo

O DNS propagou corretamente — o A record de `davions.nevoxholding.com` agora aponta para o VPS (`147.93.112.182`). O Caddy recebe a requisição, consulta `validate-domain` (que retorna `{"registered":true}`), emite o certificado e faz o proxy reverso para `davions-page-builder.lovable.app`.

**O problema está no `header_up Host`.**

O Caddyfile atual usa:
```caddyfile
header_up Host {upstream_hostport}
```

Isso substitui o `Host` header pelo hostname do servidor de destino (`davions-page-builder.lovable.app`). Quando o React app carrega na CDN da Lovable com `Host: davions-page-builder.lovable.app`, o `window.location.hostname` no browser do cliente ainda é `davions.nevoxholding.com` — **porque o browser vê a URL original**.

Mas então por que o 404? A CDN da Lovable recebe o request com `Host: davions-page-builder.lovable.app` — isso está correto e funciona. O 404 que o usuário vê é **dentro do React Router**, não na CDN.

### Causa raiz real

Relendo o `custom-domain.ts`:

```ts
const EXACT_APP_HOSTNAMES = [
  "nevoxholding.com",
  "www.nevoxholding.com",
  ...
  "davions-page-builder.lovable.app",
];
```

Quando o browser abre `davions.nevoxholding.com`:
- `window.location.hostname` = `davions.nevoxholding.com`
- `isCustomDomain("davions.nevoxholding.com")` → verifica `EXACT_APP_HOSTNAMES` → não está lá ✓ → verifica `PLATFORM_DOMAINS` → não termina em `.lovable.app` etc. ✓ → retorna `true` ✓

Isso está correto. O `onCustomDomain = true` e as rotas do `CustomDomainStore` devem ser carregadas.

Mas a detecção acontece **uma vez, no carregamento do módulo** (`const onCustomDomain = isCustomDomain()`). Se o bundle for servido com `Host: davions-page-builder.lovable.app` (como configurado no Caddyfile com `header_up Host {upstream_hostport}`), mas o Lovable CDN verificar o `Host` para decidir qual app/SPA servir, e o domínio customizado não estar registrado na plataforma Lovable, o CDN serve o HTML mas não reconhece o domínio — possivelmente retornando 404 antes mesmo do React carregar.

### O problema real: Lovable CDN não reconhece o domínio customizado

O Caddy envia `Host: davions-page-builder.lovable.app` para a CDN da Lovable. A CDN serve o app corretamente porque reconhece esse hostname. **O browser recebe o HTML/JS e o React carrega.** Dentro do React, `window.location.hostname` = `davions.nevoxholding.com` → `isCustomDomain()` = `true` → exibe `CustomDomainStore` → busca fotógrafo por `custom_domain = "davions.nevoxholding.com"` → encontra → funciona.

**Então por que 404?** Há um comportamento específico da CDN da Lovable: quando recebe um request com `Host: davions-page-builder.lovable.app` mas o **IP de origem** é o VPS e não um cliente real, pode haver algum bloqueio ou redirect.

Vamos analisar o Caddyfile mais cuidadosamente. O problema mais provável é que o Caddyfile precisa passar o `Host` **original** do cliente para que o Lovable CDN saiba para qual projeto rotear (o Lovable usa o host para determinar qual projeto servir). Sem isso, o CDN pode não reconhecer o request.

### Caddyfile correto vs. atual

**Atual (problemático):**
```caddyfile
header_up Host {upstream_hostport}   # envia "davions-page-builder.lovable.app"
```

**Correto:**
O Lovable CDN precisa receber `Host: davions-page-builder.lovable.app` para saber qual projeto servir. Isso está certo. O React no browser vai usar `window.location.hostname` = `davions.nevoxholding.com` para a detecção de domínio customizado. Então o Caddyfile atual deveria funcionar...

**Aguarda — reanalisando o fluxo completo:**

1. Browser → `https://davions.nevoxholding.com` → VPS
2. Caddy no VPS recebe com `Host: davions.nevoxholding.com`
3. Caddy faz proxy para `https://davions-page-builder.lovable.app` com `Host: davions-page-builder.lovable.app`
4. Lovable CDN serve o bundle React do projeto
5. Browser executa o JS — `window.location.hostname` = `davions.nevoxholding.com`
6. `isCustomDomain()` = `true` → rotas do `CustomDomainStore`
7. Query por `custom_domain = "davions.nevoxholding.com"` → encontra → renderiza

Isso DEVERIA funcionar. Mas o Lovable CDN pode estar servindo um **SPA com HTML que tem `<base href>` ou configuração de rotas específica** que causa o 404 quando o hostname não é o esperado.

**Hipótese mais provável**: O Lovable CDN retorna uma resposta diferente quando vê que o `Host` não corresponde a nenhum domínio registrado na plataforma Lovable — retornando diretamente o 404 da plataforma antes do React sequer carregar. O HTML que deveria ser servido não está sendo entregue.

### Solução: o Caddyfile precisa passar `X-Forwarded-Host` para o CDN reconhecer

Na verdade, testando a teoria: o CDN da Lovable serve o app para qualquer host que proxie para ele, desde que o `Host` header seja um dos hostnames conhecidos. Se o host for desconhecido, o CDN retorna 404.

**A correção é simples:** O Caddy deve sempre passar `Host: davions-page-builder.lovable.app` (como já faz com `header_up Host {upstream_hostport}`), e o `X-Forwarded-Host` com o domínio original para que o React detecte o domínio customizado. Mas `window.location.hostname` usa o que o **browser** vê (a URL da barra de endereço), não os headers HTTP — então o `X-Forwarded-Host` não afeta a detecção no React.

**Diagnóstico final e correto**: O problema pode ser que o **certificado TLS ainda não foi emitido** pelo Caddy para `davions.nevoxholding.com`. O fluxo On-Demand TLS do Caddy é acionado na **primeira requisição HTTPS** após a propagação do DNS. O Caddy precisa conseguir se comunicar com `validate-domain` e depois com Let's Encrypt para emitir o certificado. Isso pode levar de alguns segundos a alguns minutos na primeira requisição.

**Ou**, o `validate-domain` está retornando `{"registered":true}` com status 200, mas o Caddy requer um status `2xx` — o que está correto. Porém, verificando o Caddyfile: a diretiva `ask` só retorna true se a resposta for `2xx`. Está ok.

**Verificação necessária**: Precisamos checar os logs do Caddy no VPS para ver o erro exato. O usuário deve executar `journalctl -u caddy -n 50` no servidor.

### Plano de ação

Não há mudança de código a fazer no app React — a lógica de detecção de domínio customizado está correta. O problema é de **infraestrutura do servidor Caddy**.

As causas mais prováveis em ordem:
1. **Certificado ainda sendo emitido** — primeira requisição ao domínio após DNS propagar aciona o On-Demand TLS; o Caddy precisa de alguns segundos/minutos para emitir o certificado Let's Encrypt
2. **Erro no Caddyfile** — a diretiva `https://` sem hostname pode não funcionar como esperado em todas as versões do Caddy
3. **Rate limit do Let's Encrypt** — se houve muitas tentativas anteriores com DNS errado

Proposta: atualizar a página `AdminVpsSetup` com o Caddyfile corrigido e com instruções de diagnóstico via logs do Caddy — incluindo o comando `journalctl -u caddy` e como verificar se o certificado foi emitido.

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/admin/AdminVpsSetup.tsx` | Adicionar seção "Diagnóstico" com comandos de log do Caddy e corrigir o Caddyfile com a sintaxe alternativa usando `@custom_domain matcher` para maior compatibilidade |

### Caddyfile corrigido (alternativa mais robusta)

```caddyfile
{
  email admin@davions.com
  on_demand_tls {
    ask https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain={host}
    interval 2m
    burst    5
  }
}

# Bloqueia acesso direto por IP
:80 {
  respond "Not Found" 404
}

# Captura QUALQUER hostname HTTPS via On-Demand TLS
https:// {
  tls {
    on_demand
  }
  reverse_proxy https://davions-page-builder.lovable.app {
    header_up Host {upstream_hostport}
    header_up X-Forwarded-Host {host}
    header_up X-Real-IP {remote_host}
    transport http {
      tls_server_name davions-page-builder.lovable.app
    }
  }
}
```

A diferença chave: **separar `:80` do bloco `:80, :443`** — o bloco anterior `:80, :443 { tls internal }` poderia interferir com o On-Demand TLS no port 443, já que ambos blocos competiam pelo port 443. Com `:80` separado apenas para rejeitar HTTP, o bloco `https://` fica exclusivo para HTTPS sem conflito.
