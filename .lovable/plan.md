
## Nova página `/admin/vps-setup`

### O que criar

Uma página de referência interna para admins com o guia completo de configuração do servidor VPS/Caddy. Conteúdo estático — sem queries ao banco.

### Estrutura da página

Organizada em seções colapsáveis ou scrolláveis com código copiável:

1. **Prerequisites** — Ubuntu 22.04, portas 80/443/22 abertas, IP do VPS
2. **Install Caddy** — bloco de comandos `apt`
3. **Configure Caddyfile** — bloco com o Caddyfile completo e correto (usando `ask`, `on_demand_tls`, `reverse_proxy`, `header_up`, `tls_server_name`)
4. **Firewall (ufw)** — comandos para abrir as portas necessárias
5. **Test & Verify** — comandos `curl` para testar a Edge Function `validate-domain` e verificar o SSL
6. **Troubleshooting** — lista de erros comuns e soluções

### Caddyfile exibido na página

```
{
  email admin@davions.com
  on_demand_tls {
    ask https://pjcegphrngpedujeatrl.supabase.co/functions/v1/validate-domain?domain={host}
    interval 2m
    burst    5
  }
}

:80, :443 {
  tls internal
  respond "Not Found" 404
}

https:// {
  tls { on_demand }
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

### Arquivos alterados

| Arquivo | Ação |
|---|---|
| `src/pages/admin/AdminVpsSetup.tsx` | Criar — página completa de guia |
| `src/components/admin/AdminSidebar.tsx` | Adicionar item "VPS Setup" com ícone `Server` |
| `src/App.tsx` | Adicionar rota `/admin/vps-setup` |

### Padrão visual

Mesmo padrão da `AdminDashboard`: `AdminLayout` wrapper, tipografia `text-[10px] tracking-[0.3em] uppercase` para labels, blocos de código em `font-mono bg-muted` com botão copy inline (reusar o padrão `CopyButton` já existente nas outras páginas admin).

Cada bloco de comando/código terá:
- Label descritivo acima
- Bloco escuro com o código
- Ícone de cópia no canto superior direito
