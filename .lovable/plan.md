
## Problema: Múltiplos Loading States em Cascata

### Causa raiz

A sequência atual tem 4-5 queries ao banco **em série** antes de qualquer página aparecer:

```text
1. getSession()                          → AuthContext
2. resolvePhotographerId() (studio_members) → AuthContext
3. useStudioPermissions → photographers   → PermissionGate
4. useStudioPermissions → studio_members  → PermissionGate (redundante!)
5. useStudioPermissions → studio_roles    → PermissionGate
```

Steps 3-5 duplicam o trabalho do step 2, e só disparam **depois** que steps 1-2 terminam.

### Solução

**1. Expor `isOwner` no `AuthContext`**

O `AuthContext` já sabe se o user é dono (ao resolver o `photographerId`, ele consulta `studio_members`). Podemos guardar essa informação e expô-la, evitando que o `useStudioPermissions` refaça as mesmas queries.

```ts
// AuthContext — adicionar ao state e ao retorno:
isOwner: boolean | null   // null = ainda resolvendo
```

Durante `resolvePhotographerId`, se `memberRow` existe → `isOwner = false`, caso contrário → `isOwner = true`.

**2. Otimizar `useStudioPermissions` para usar dados já resolvidos**

Se `AuthContext` já tem `isOwner = true`, o `useStudioPermissions` retorna imediatamente sem fazer nenhuma query adicional.

**3. Adicionar safety timeout no `PermissionGate`**

Se `useStudioPermissions` demorar mais de 4s, libera o acesso para evitar tela infinita (owners nunca devem ser bloqueados).

**4. Paralelizar as queries do `resolvePhotographerId`**

Atualmente o `AuthContext` faz a query de `studio_members` de forma sequencial. Podemos fazer a query de `photographers` e `studio_members` em paralelo para cortar o tempo pela metade.

### Arquivos a alterar

1. **`src/contexts/AuthContext.tsx`**:
   - Adicionar `isOwner: boolean | null` ao state e interface
   - Paralelizar queries: buscar `photographers` e `studio_members` ao mesmo tempo
   - Expor `isOwner` no context value

2. **`src/hooks/useStudioPermissions.ts`**:
   - Consumir `isOwner` do `AuthContext` diretamente
   - Se `isOwner === true`, retornar imediatamente sem queries adicionais
   - Eliminar a query redundante de `studio_members`

3. **`src/components/PermissionGate.tsx`**:
   - Adicionar safety timeout de 4s que libera a página se o loading persistir
   - Isso garante que owners nunca fiquem presos

### Resultado esperado

```text
ANTES: getSession → resolveId → [render] → photographers → members → roles = 5 round-trips
DEPOIS: getSession + [photographers ∥ members] → [render] → roles apenas (se member) = 2-3 round-trips
```

Para owners (maioria dos usuários), o tempo de loading cai de ~5 queries para ~2 queries em paralelo.
