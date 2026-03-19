
## Diagnóstico

### Causa raiz: `resolvePhotographerId` sem filtro de usuário

No `AuthContext.tsx`, a função `resolvePhotographerId` está com uma query incorreta:

```ts
const { data: memberRow } = await supabase
  .from("studio_members")
  .select("photographer_id")
  .eq("status", "active")   // ← sem .eq("user_id", userId) ou filtro por email
  .limit(1)
  .maybeSingle();
```

Ela **não filtra pelo usuário logado** — busca qualquer linha ativa da tabela. Isso significa:
- Para usuários normais (não membros de studio), pode retornar o `photographer_id` de outro usuário aleatório
- A RLS deveria bloquear isso, mas pode gerar um comportamento lento/incorreto que impede o carregamento

Olhando a migration `20260319111136`, a função SQL `get_my_photographer_id()` usa `email` para matching. O código JS deveria fazer o mesmo — filtrar por `email`.

### Problema secundário: dupla inicialização

`resolvePhotographerId` é chamada tanto no `getSession()` quanto no `onAuthStateChange` simultaneamente no bootstrap, causando duas queries simultâneas desnecessárias.

### Warning no console (não crítico)

`PublicOnlyRoute` aparece no warning de `ref` — não causa o loading infinito mas pode ser corrigido com `React.forwardRef`.

---

## Plano de Fix

### 1. Corrigir `resolvePhotographerId` em `src/contexts/AuthContext.tsx`

Adicionar o filtro de email para que a query seja idêntica à lógica da função SQL:

```ts
async function resolvePhotographerId(userId: string, userEmail: string): Promise<string> {
  const { data: memberRow } = await supabase
    .from("studio_members")
    .select("photographer_id")
    .eq("email", userEmail)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (memberRow?.photographer_id) {
    return memberRow.photographer_id;
  }
  return userId;
}
```

Também passar `session.user.email` nos dois pontos de chamada.

### 2. Evitar dupla execução no bootstrap

Usar uma flag `initialized` para garantir que a resolução só aconteça uma vez no bootstrap, evitando race conditions entre `getSession` e `onAuthStateChange`.

### 3. Arquivo a alterar

- `src/contexts/AuthContext.tsx` — corrigir a query e a lógica de bootstrap
