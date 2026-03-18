
## Desativar grupos de menus temporariamente

### Situação atual
O `DashboardSidebar.tsx` constrói os grupos a partir da função `buildGroups()` e de uma array estática `groups`. Os grupos são renderizados tanto no modo expandido quanto no colapsado. Não existe hoje nenhum mecanismo de flag para ocultar grupos inteiros.

### Abordagem — flag `disabled` no tipo `MenuGroup`
A solução mais limpa e reversível é adicionar um campo `disabled?: true` na definição de cada grupo que precisa ser ocultado. O código de renderização simplesmente pula grupos com `disabled: true`. Para reativar no futuro, basta remover o `disabled` dos grupos desejados — alteração de uma linha por grupo.

### Grupos a desativar (pelos `stableKey`)
| stableKey | Label visível |
|---|---|
| `"Marketing"` | MARKETING |
| `"AI"` | IA |
| `"Finance"` | FINANCEIRO |
| `"CRM"` | CRM |
| `"Workflows"` | WORKFLOWS |
| `"My Features"` | MEUS RECURSOS |

### Arquivos alterados
**Apenas `src/components/dashboard/DashboardSidebar.tsx`** — 2 blocos de mudança:

1. **Tipo `MenuGroup`** — adicionar `disabled?: boolean`
2. **Array estática `groups`** (linhas ~237-278) e **função `buildGroups`** (linhas ~143-219) — adicionar `disabled: true` nos 6 grupos listados acima
3. **Renderização expandida e colapsada** — adicionar `if (group.disabled) return null;` na `.map()` de cada modo (expanded e collapsed)

### Como reverter no futuro
Remover `disabled: true` de qualquer grupo para reativá-lo. Nenhuma migração de banco necessária — é puramente frontend.

### Fluxo simplificado
```text
buildGroups() / groups[]
  └── Marketing  disabled: true  ──► renderização pula
  └── AI         disabled: true  ──► renderização pula
  └── Finance    disabled: true  ──► renderização pula
  └── CRM        disabled: true  ──► renderização pula
  └── Workflows  disabled: true  ──► renderização pula
  └── My Features disabled: true ──► renderização pula
  └── Photographers (sem flag)   ──► renderiza normalmente
  └── Settings   (sem flag)      ──► renderiza normalmente
```
