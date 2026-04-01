
## Levar o Editor de Emails para o Dashboard do Fotógrafo

### Contexto
O módulo de email admin (`AdminEmailManager`) já é isolado por `user_id` via RLS. Não há verificação de role — qualquer usuário autenticado pode usar. Basta criar uma rota no dashboard e adicionar ao sidebar.

### Alterações

**1. Nova página `src/pages/dashboard/EmailInbox.tsx`**
- Layout fullscreen igual ao admin (`flex flex-col h-screen overflow-hidden`)
- Header com botão "Voltar" para `/dashboard`
- Renderiza `<AdminEmailManager />` no corpo

**2. Adicionar rota em `src/App.tsx`**
- `/dashboard/email-inbox` → `EmailInbox`

**3. Adicionar item no sidebar `src/components/dashboard/DashboardSidebar.tsx`**
- Item "Email" com ícone `Mail` no grupo adequado
- Link para `/dashboard/email-inbox`

**4. Permissões (opcional)**
- Verificar se o grupo de menu onde o item será adicionado precisa de `PermissionGate`

### Detalhes técnicos
- Nenhuma migração de banco necessária — as tabelas e RLS já suportam multi-usuário
- Nenhuma alteração nas Edge Functions — já autenticam por JWT
- O componente `AdminEmailManager` será reutilizado diretamente (sem cópia)
