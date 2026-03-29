

## Ocultar grupos do sidebar para me@palomaschell.com

### Problema
A usuária `me@palomaschell.com` é admin e vê todos os grupos do sidebar, incluindo os desabilitados. Precisa-se ocultar os grupos: Marketing, IA, Financeiro, CRM, Workflows, Configurações e Meus Recursos.

### Solução
Adicionar uma lista de `stableKeys` restritos para este email específico no `DashboardSidebar.tsx`. Após determinar `isAdmin` e carregar o email do usuário, filtrar os grupos cujo `stableKey` esteja na lista restrita.

### Alteração

**Arquivo: `src/components/dashboard/DashboardSidebar.tsx`**

1. Definir uma constante com os grupos ocultos para este usuário:
```typescript
const RESTRICTED_ADMINS: Record<string, string[]> = {
  "me@palomaschell.com": ["Marketing", "AI", "Finance", "CRM", "Workflows", "Settings", "My Features"],
};
```

2. Nos dois pontos onde se filtra `group.disabled && !isAdmin`, adicionar verificação extra:
```typescript
// Antes:
if (group.disabled && !isAdmin) return null;

// Depois:
const restricted = RESTRICTED_ADMINS[user?.email ?? ""] ?? [];
if (group.disabled && !isAdmin) return null;
if (restricted.includes(group.stableKey)) return null;
```

Isso oculta os grupos especificados para esta conta sem afetar outros admins.

