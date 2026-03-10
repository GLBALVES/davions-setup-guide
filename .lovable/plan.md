
## Remover confirmação de email no cadastro

### O que precisa mudar

Dois lugares precisam ser alterados:

**1. Backend — desativar email confirm (config.toml)**
Adicionar no `supabase/config.toml` a configuração de auth com `enable_confirmations = false`. Isso faz o Supabase confirmar automaticamente o usuário ao cadastrar, sem precisar clicar em nenhum link.

**2. Frontend — `src/pages/Signup.tsx`**
Atualmente, após o cadastro bem-sucedido, o componente exibe a tela "Check your inbox" e fica parado lá. Com a confirmação desativada, o usuário já estará autenticado imediatamente. Então:
- Remover a tela de sucesso "Check your inbox"
- Após o `signUp()` ser bem-sucedido → redirecionar direto para `/dashboard` com `navigate("/dashboard")`

### Arquivos a editar

| Arquivo | Mudança |
|---|---|
| `supabase/config.toml` | Adicionar bloco `[auth]` com `enable_confirmations = false` |
| `src/pages/Signup.tsx` | Remover estado `success` e tela de inbox; redirecionar para `/dashboard` após cadastro |
