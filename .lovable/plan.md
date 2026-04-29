# Corrigir entrega do convite e personalizar emails

## Problema

O email de convite não chegou porque o endereço usado já existia como usuário. Hoje a edge function `invite-lead-as-user` apenas marca o lead como "Invited" e não dispara nada quando o usuário já existe. Além disso, os emails padrão do Supabase (remetente `noreply@mail.app.supabase.io`) costumam cair no spam, o que também explica não-recebimento mesmo em fluxos novos.

## O que vou fazer

### 1. Atualizar a edge function `invite-lead-as-user`
Quando o usuário **já existe**:
- Em vez de só retornar `already_existed`, disparar `auth.admin.generateLink` do tipo `recovery` (ou `resetPasswordForEmail`) usando o mesmo `redirectTo` (`/reset-password`).
- A página `ResetPassword.tsx` já trata tanto `type=invite` quanto `type=recovery`, então o usuário cai no mesmo fluxo de definir senha.
- Garantir que o `redirectTo` aponte sempre para `https://www.davions.com/reset-password` (produção), independente de onde o admin estiver clicando.
- Atualizar `leads.invited_at` em ambos os casos (novo convite ou reenvio).

### 2. Melhorar UX no AdminLeads
- Quando o lead já tem `invited_at`, o botão passa a se chamar **"Reenviar convite"** (em vez de só "Invite").
- Mensagem do toast diferenciada: "Convite enviado" vs "Link de redefinição reenviado".

### 3. Configurar emails de auth com domínio próprio (resolve o problema de spam)
Como o domínio `davions.com` já está configurado no projeto, vou:
- Rodar o scaffold dos templates de auth (`scaffold_auth_email_templates`) — gera os templates React Email para signup, invite, recovery, magic-link, email-change, reauthentication.
- Aplicar a identidade visual do app aos templates: preto (#000000), branco, rose (#E11D48), fonte Inter, logo do Davions se existir em `public/`.
- Traduzir o conteúdo dos emails para **português** (idioma principal do app, com menção a EN/ES no rodapé).
- Adaptar os textos dos CTAs ao tom do app (ex.: "Definir minha senha", "Acessar Davions").
- Fazer deploy da função `auth-email-hook`.

Resultado: emails passam a ser enviados pelo domínio configurado no Lovable Cloud (não mais `noreply@mail.app.supabase.io`), com branding Davions, melhorando muito a entregabilidade.

## Detalhes técnicos

- Edge function usa `generateLink({ type: 'recovery', email, options: { redirectTo } })` para usuários existentes. Esse link tem mesma estrutura `#access_token=...&type=recovery`, e `ResetPassword.tsx` já cobre o evento `PASSWORD_RECOVERY` / `SIGNED_IN`.
- O scaffold cria `supabase/functions/auth-email-hook/index.ts` + `supabase/functions/_shared/email-templates/*.tsx`. Vou customizar os 6 templates com cores/tipografia da marca antes do deploy.
- Após deploy, ativação dos emails de auth com domínio próprio acontece automaticamente no Lovable Cloud assim que a verificação DNS terminar (já está em curso).
- Não precisa de Resend nem nenhum serviço externo — tudo via Lovable Cloud.

## Fora de escopo
- Mudar a cópia (texto) dos demais emails transacionais não-auth.
- Renomear/mover campos no banco (`invited_at`/`invited_user_id` continuam como estão).
