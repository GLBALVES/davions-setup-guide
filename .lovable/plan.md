

## Alinhar cards do Kanban entre colunas

### Problema
As colunas "SHOT" e "POST-PRODUCTION" têm botões extras (Timer/deadline popover) no header que não existem nas outras colunas. Isso faz o header dessas colunas ter altura diferente, empurrando os cards para baixo e desalinhando com as demais colunas.

### Solução
Definir uma altura fixa (`h-6`) no container do header de cada coluna (`KanbanColumn`), garantindo que todas as colunas tenham a mesma altura de header independentemente do conteúdo extra.

### Arquivo

| Arquivo | Mudança |
|---------|---------|
| `src/pages/dashboard/Projects.tsx` | Linha 686 — adicionar `h-6` ao div do header da coluna para forçar altura uniforme |

