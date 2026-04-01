

## Restringir sidebar para usuários não-admin

### Problema
Atualmente, usuários não-admin veem o grupo **Settings** e o item **Website** dentro de Fotógrafos. Na fase de testes, apenas admins devem ver esses itens.

### Alterações

**Arquivo: `src/components/dashboard/DashboardSidebar.tsx`**

1. **Ocultar o grupo Settings para não-admins** — adicionar a flag `adminOnly: true` ao tipo `MenuGroup` e marcar o grupo Settings com ela. Na renderização (linhas ~956 e ~1065), filtrar grupos com `adminOnly` quando `!isAdmin`.

2. **Ocultar o item Website para não-admins** — adicionar `adminOnly?: boolean` ao tipo `MenuItem` e marcar o item Website (`permKey: "website"`) com `adminOnly: true`. No `filterItems()` (linha ~657), filtrar itens com `adminOnly` quando `!isAdmin`.

### Detalhes técnicos

- Adicionar `adminOnly?: boolean` aos tipos `MenuItem` e `MenuGroup`
- No grupo Settings (stableKey `"Settings"`), adicionar `adminOnly: true`
- No item Website dentro de Photographers, adicionar `adminOnly: true`
- No filtro de grupos (ambos collapsed e expanded), adicionar: `if (group.adminOnly && !isAdmin) return null;`
- No `filterItems`, adicionar: filtrar itens com `adminOnly` quando `!isAdmin`
- O estado `isAdmin` já existe no componente (linha 633), então não precisa de queries adicionais

### Resultado
Usuários não-admin verão apenas: Favoritos + Fotógrafos (Projetos, Painel, Sessões, Calendário, Galerias de Prova, Galerias Finais, Personalizar, Caixa de Email). Admins continuam vendo tudo.

