
## Diagnóstico: CORS nos Caddyfiles + Documentação

### O que foi analisado

O React app chama o Supabase diretamente pelo browser (via `supabase-js`). A URL do Supabase é `https://pjcegphrngpedujeatrl.supabase.co` — um domínio externo ao custom domain do fotógrafo. Quando o browser faz uma requisição do domínio `davions.giombelli.com.br` para o Supabase, o Supabase **já retorna os headers CORS corretos** (`Access-Control-Allow-Origin: *`) por padrão. O Caddy não intercepta essas chamadas — ele apenas faz proxy do HTML/JS/assets para a CDN da Lovable.

**O header `Access-Control-Allow-Origin "*"` no Caddyfile só seria necessário se o Caddy estivesse servindo a API diretamente** — o que não é o caso aqui.

### Porém: há um cenário real de CORS no Caddy

Quando o browser carrega `https://davions.giombelli.com.br`, recebe o HTML/JS da Lovable via proxy Caddy. Se o Caddy — ao fazer proxy — **remover ou não repassar** os headers de resposta da Lovable CDN, assets como fontes ou imagens com `fetch()` podem falhar.

O header sugerido pelo usuário deve ser adicionado à resposta do bloco `:80` e ao bloco principal do Caddy (tanto standalone quanto Easypanel) como header de resposta, **não como header upstream**.

### O que será feito

**`src/pages/admin/AdminVpsSetup.tsx`**:

1. **`CADDYFILE` (standalone)** — adicionar `header Access-Control-Allow-Origin "*"` dentro do bloco `https://`, após o `reverse_proxy`:

```caddy
https:// {
  tls {
    on_demand
  }
  header Access-Control-Allow-Origin "*"
  reverse_proxy https://davions.com {
    ...
  }
}
```

2. **`CADDYFILE_EASYPANEL`** — adicionar `header Access-Control-Allow-Origin "*"` dentro do bloco `:8080`:

```caddy
:8080 {
  header Access-Control-Allow-Origin "*"
  reverse_proxy https://davions.com {
    ...
  }
}
```

3. **Troubleshooting** — adicionar nova entrada: "Photographer data not loading (blank store page)" com instrução sobre o header CORS.

4. **Nota explicativa na UI** — adicionar um callout pequeno na seção de Caddyfile explicando que o `header` diretivo garante que requests do browser para assets servidos pelo proxy não sejam bloqueados por CORS.

### Nenhuma mudança no código React é necessária

As chamadas Supabase já funcionam — o Supabase retorna CORS correto independente do domínio do cliente. O problema seria apenas se o Caddy suprimisse headers, o que o `header` diretivo no Caddyfile resolve.

### Arquivos alterados

- **`src/pages/admin/AdminVpsSetup.tsx`** — atualizar `CADDYFILE`, `CADDYFILE_EASYPANEL`, e `TROUBLESHOOT`
