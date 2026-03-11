
## Gestão de Usuários do Estúdio (Access Control)

### O que construir

Uma página completa em **Settings → Access Control** para o fotógrafo convidar colaboradores (assistentes, editores, sócios) e definir quais seções do dashboard cada papel pode acessar.

---

### Modelo de dados (3 tabelas novas)

```text
studio_roles
├── id (uuid PK)
├── photographer_id (uuid → photographers.id)
├── name (text)           — ex: "Editor", "Assistente"
├── permissions (jsonb)   — mapa de { "sessions": true, "galleries": false, ... }
└── created_at

studio_members
├── id (uuid PK)
├── photographer_id (uuid → photographers.id)
├── email (text)          — email do colaborador convidado
├── full_name (text)
├── role_id (uuid → studio_roles.id)
├── status (text)         — 'pending' | 'active' | 'revoked'
├── invited_at
└── joined_at

app_role (enum)
└── 'owner' | 'member'

user_roles (conforme padrão da plataforma)
├── id, user_id, role (app_role)
```

**Permissões disponíveis** — uma chave por grupo do sidebar:
`sessions`, `schedule`, `bookings`, `galleries`, `website`, `blog`, `creative`, `seo`, `emails`, `push`, `chat`, `agents`, `clients`, `workflow`, `recurring`, `finance`

---

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Nova migration: tabelas `studio_roles` + `studio_members` com RLS |
| `src/pages/dashboard/AccessControl.tsx` | Nova página completa |
| `src/App.tsx` | Nova rota `/dashboard/access-control` |
| `src/components/dashboard/DashboardSidebar.tsx` | Ligar "Access Control" → `/dashboard/access-control` |

---

### Layout da página

```text
┌─────────────────────────────────────────────────────┐
│  Access Control                                     │
│  [+ Invite User]                                    │
├────────────────────┬────────────────────────────────┤
│  ROLES             │  MEMBERS                       │
│  ─────────────     │  ─────────────────────────     │
│  [+ New Role]      │  Nome | Email | Papel | Status │
│                    │  ─────────────────────────     │
│  ▸ Editor          │  Ana Lima  editor   active     │
│    Sessions ✓      │  João     pending   [Reenviar] │
│    Galleries ✓     │                                │
│    Blog ✗          │                                │
│    …               │                                │
│                    │                                │
│  ▸ Assistente      │                                │
└────────────────────┴────────────────────────────────┘
```

**Painel esquerdo — Roles:**
- Lista de papéis criados pelo fotógrafo
- Ao selecionar, exibe checklist de permissões agrupadas
- Botão "Save" por role

**Painel direito — Members:**
- Tabela com nome, email, papel atribuído, status do convite
- Diálogo "Invite" com: email, nome, seleção de role
- Ação de revogar acesso

---

### Fluxo de convite (MVP)

Por ser MVP, o convite é feito pelo email — o fotógrafo insere o email do colaborador e o sistema cria um registro `pending` em `studio_members`. A ativação completa (link de convite por email) pode ser implementada futuramente.

---

### RLS

- `studio_roles`: `photographer_id = auth.uid()` para ALL
- `studio_members`: `photographer_id = auth.uid()` para ALL
- Sem exposição de dados entre fotógrafos

---

### Ordem de implementação

1. Migration: criar `studio_roles` + `studio_members`
2. Criar `AccessControl.tsx` com layout em duas colunas
3. Registrar rota em `App.tsx`
4. Ativar link "Access Control" no sidebar

Nenhuma mudança nas tabelas existentes. Nenhum edge function necessário para o MVP.
