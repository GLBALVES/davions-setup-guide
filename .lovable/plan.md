
## Tela Admin: Gerenciamento de Domínios Personalizados

### O que será construído

Uma nova página `/admin/domains` no painel admin que lista todos os fotógrafos que cadastraram domínios personalizados, com:
- Domínio cadastrado
- Fotógrafo associado (nome + email)
- Status de verificação (calculado ao testar o registro TXT `_davions`)
- Data de cadastro
- Ação de copiar/visualizar o domínio

---

### Lógica de Status

O registro `custom_domain` já existe na tabela `photographers`. O status de verificação será derivado da presença do registro DNS `_davions`, mas como não é possível fazer lookup DNS do browser, o status será definido como:

- **Configured** — domínio salvo pelo fotógrafo (estado padrão, sempre presente)  
- **Awaiting Setup** — fotógrafo que ainda não propagou o DNS (sem como distinguir do frontend sem um edge function)

Para evitar complexidade desnecessária, o status será uma badge simples indicando que o domínio está **cadastrado** (visível no sistema) sem tentar validar o DNS em tempo real. O admin pode manualmente copiar e testar o domínio.

---

### Arquivos a modificar/criar

**1. `src/pages/admin/AdminDomains.tsx`** — nova página (padrão dos outros admin pages)

Estrutura:
```
Header: "Custom Domains"
Tabela com colunas:
  - Studio (nome + email)
  - Domain (font-mono, link externo)  
  - Type (Root Domain / Subdomain — calculado automaticamente)
  - Store Slug
  - Added (data formatada)
  - Actions (botão copiar, botão abrir)

Linha expandida ao clicar:
  - Registros DNS necessários (A record + TXT) calculados dinamicamente igual ao WebsiteSettings
  - Aviso Cloudflare
```

**2. `src/components/admin/AdminSidebar.tsx`** — adicionar item ao menu

```
{ to: "/admin/domains", label: "Domains", icon: Globe }
```

**3. `src/App.tsx`** — adicionar rota `/admin/domains`

---

### Detalhes técnicos

Query:
```tsx
supabase
  .from("photographers")
  .select("id, email, full_name, business_name, custom_domain, store_slug, created_at")
  .not("custom_domain", "is", null)
  .order("created_at", { ascending: false })
```

Lógica de tipo de domínio (reutilizada do WebsiteSettings):
```tsx
const parts = domain.split(".");
const isSubdomain = parts.slice(1).length >= 2;
// isSubdomain → "Subdomain" badge, caso contrário "Root Domain"
```

Nenhuma migração de banco de dados necessária — campo `custom_domain` já existe na tabela `photographers`.

---

### Total: 3 arquivos, ~150 linhas novas
