## Objetivo

Em `/admin/leads`, adicionar um botão por lead que cria uma conta de usuário (photographer) no app e envia um email para o cliente definir a senha e fazer login.

## Fluxo

1. Admin clica no botão **"Convidar"** ao lado do lead.
2. Confirmação rápida (dialog) mostrando nome + email.
3. Frontend chama uma nova edge function `invite-lead-as-user`.
4. A edge function (com `service_role`):
   - Verifica se o solicitante é admin (via `has_role` em `user_roles` com `'admin'`).
   - Verifica se já existe usuário com aquele email — se sim, retorna aviso.
   - Cria o usuário em `auth.users` via `admin.inviteUserByEmail(email, { redirectTo: <APP_URL>/reset-password, data: { full_name } })`. Esse método já dispara o email de convite nativo do Supabase (template "Invite user"), que leva o usuário à página `/reset-password` para definir senha.
   - Insere/atualiza registro em `public.photographers` com `approval_status = 'approved'` e `full_name` vindo do lead (o trigger `handle_new_user` cria com `pending`, então fazemos `update` logo após).
   - Marca o lead como convidado (ver mudança de schema abaixo).
5. UI atualiza: badge "Convidado" no lead + toast de sucesso.

## Mudança de schema

Adicionar duas colunas em `public.leads`:
- `invited_at timestamptz null`
- `invited_user_id uuid null`

Migration simples; sem alterar RLS existente.

## Página de redefinição

Já existe `/reset-password` (`src/pages/ResetPassword.tsx`) que trata `type=recovery` e também `type=invite` via `onAuthStateChange` (evento `PASSWORD_RECOVERY` é disparado para invites também). Vou verificar e, se necessário, adicionar tratamento explícito para o evento `SIGNED_IN` proveniente de `type=invite` para garantir que o usuário consegue definir a senha mesmo vindo de convite.

## Email

O email é enviado automaticamente pelo Supabase Auth (template "Invite user") com o `redirectTo` apontando para `/reset-password`. Sem necessidade de scaffolding adicional — usa o sistema de auth emails padrão. Texto pode ser personalizado depois via templates de auth se desejado.

## Internacionalização

Botão, dialog e toasts em EN/PT/ES via `useLanguage()` seguindo o padrão de `WaitlistModal.tsx`.

## Arquivos

- **Criar**: `supabase/functions/invite-lead-as-user/index.ts` + entrada em `supabase/config.toml` (`verify_jwt = false`, validação manual do JWT do admin no código).
- **Migration**: adicionar colunas `invited_at`, `invited_user_id` em `leads`.
- **Editar**: `src/pages/admin/AdminLeads.tsx` — novo botão "Convidar" (ícone `UserPlus`), dialog de confirmação, chamada à edge function, exibição de badge "Convidado" quando `invited_at` não é nulo.
- **Editar (se necessário)**: `src/pages/ResetPassword.tsx` para suportar evento de invite além de recovery.

## Segurança

- Edge function valida JWT e checa `has_role(user_id, 'admin')` antes de criar conta.
- Usa `service_role` apenas dentro da function.
- Sem exposição do service_role no cliente.
