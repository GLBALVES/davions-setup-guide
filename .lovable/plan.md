
## Redirecionar usuários autenticados para o Dashboard

### Situação atual
- `Index.tsx`, `Login.tsx` e `Signup.tsx` não verificam se o usuário já está logado.
- `AuthContext` já expõe `user` e `loading` via `useAuth()`.
- `ProtectedRoute` já faz o inverso (redireciona não-autenticados para `/login`).

### Abordagem
Criar um componente `PublicOnlyRoute` (espelho do `ProtectedRoute`) que:
- Enquanto `loading === true` → mostra spinner
- Se `user !== null` → `<Navigate to="/dashboard" replace />`
- Se `user === null` → renderiza os filhos normalmente

Em seguida, envolver `/`, `/login` e `/signup` com esse componente no `App.tsx`.

### Arquivos a alterar

1. **`src/components/PublicOnlyRoute.tsx`** — criar o componente guard
2. **`src/App.tsx`** — envolver as 3 rotas com `<PublicOnlyRoute>`

### Diagrama de fluxo
```text
Usuário acessa  /  ou  /login  ou  /signup
        │
        ▼
PublicOnlyRoute
        │
  loading? ──yes──► spinner
        │ no
  user logado? ──yes──► <Navigate to="/dashboard" replace />
        │ no
        ▼
  Renderiza a página normalmente
```

### Detalhe técnico
O spinner de loading usa o mesmo padrão já presente em `ProtectedRoute.tsx` para consistência visual.
