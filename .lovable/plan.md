

## Mostrar Blog e Estúdio Criativo para me@palomaschell.com

### Problema
Os itens "Blog" e "Creative Studio" pertencem ao grupo "Marketing" no sidebar, que está na lista `RESTRICTED_ADMINS` para `me@palomaschell.com` — por isso ficam ocultos.

### Solução

**Editar `src/components/dashboard/DashboardSidebar.tsx`** (linha 104):
- Remover `"Marketing"` da lista de restrições para `me@palomaschell.com`

Antes:
```ts
"me@palomaschell.com": ["Marketing", "AI", "Finance", "CRM", "Workflows", "Settings", "My Features"],
```

Depois:
```ts
"me@palomaschell.com": ["AI", "Finance", "CRM", "Workflows", "Settings", "My Features"],
```

Isso tornará o grupo Marketing (que contém Blog e Creative Studio) visível para essa usuária.

### Arquivo

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/dashboard/DashboardSidebar.tsx` — remover "Marketing" do RESTRICTED_ADMINS |

