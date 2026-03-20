
## Menu Calendário nasce colapsado com indicador para expandir

### Situação atual

O item "Calendário" (schedule) e seu sub-item "Agendamentos" (bookings, com `isSubItem: true`) são renderizados como itens planos consecutivos pelo `renderRegularItem`. Não existe nenhum mecanismo de colapso/expansão no nível de item individual — só existe colapso no nível de **grupo** (Photographers, Marketing, etc.) via `openGroups`.

### Solução

Introduzir o conceito de "parent item colapsável" diretamente no `renderRegularItem`. O item "Calendário" terá um comportamento especial: é tanto um link (`/dashboard/schedule`) quanto um gatilho de colapso que mostra/esconde seus sub-itens.

#### Estratégia de implementação

1. **Tipo `MenuItem`**: Adicionar `isCollapsibleParent?: boolean` e `parentKey?: string` (para sub-itens saberem a qual parent pertencem).

2. **Estado de colapso**: Adicionar `const [collapsedSubmenus, setCollapsedSubmenus] = useState<Record<string, boolean>>({ schedule: true })` — começa colapsado.

3. **`renderRegularItem`**: Quando `item.isCollapsibleParent === true`, renderizar um indicador `ChevronRight` ao lado do título (rotaciona 90° quando expandido). O click no chevron alterna o estado sem navegar. O link principal continua funcionando normalmente.

4. **Filtragem de sub-itens**: Na renderização dos itens do grupo, pular o item quando `item.parentKey` existe e `collapsedSubmenus[item.parentKey] === true`.

5. **Definição de itens** (linhas 139-141): 
   - `schedule`: adicionar `isCollapsibleParent: true, parentKey: "schedule"`
   - `bookings`: mudar `isSubItem: true` → adicionar `parentKey: "schedule"`

6. **Sidebar colapsada** (`CollapsedGroupPopover`): Os sub-itens aparecem normalmente no popover (não há colapso no modo icon).

#### Comportamento visual esperado

```
Modo expandido (sidebar aberta):
  ┌─ 📅 Calendário          [>]   ← chevron, começa apontando para a direita
  
  Após clicar no chevron:
  ┌─ 📅 Calendário          [v]   ← chevron rotaciona 90°
  │   └─ 📖 Agendamentos [badge]  ← sub-item aparece

Modo colapsado (sidebar icon):
  [📅]  → popover mostra "Calendário" e "Agendamentos" normalmente
```

#### Auto-expand

Quando a rota atual for `/dashboard/bookings`, o submenu deve abrir automaticamente (não ficar colapsado). Isso é feito no `useState` inicial e num `useEffect` que observa `location.pathname`.

### Arquivos a alterar

1. **`src/components/dashboard/DashboardSidebar.tsx`**:
   - `MenuItem` type: adicionar `isCollapsibleParent?: boolean` e `parentKey?: string`
   - `buildGroups`: schedule ganha `isCollapsibleParent: true, parentKey: "schedule"`; bookings ganha `parentKey: "schedule"` (mantém `isSubItem: true`)
   - Mesmo em `ALL_ITEMS` (linhas 237-241)
   - Novo estado `collapsedSubmenus` iniciado com `{ schedule: true }`
   - `useEffect` que abre quando rota for `/dashboard/bookings` ou `/dashboard/schedule`
   - `renderRegularItem`: para `isCollapsibleParent`, adicionar chevron clicável
   - Loop de renderização de itens do grupo: filtrar itens cujo `parentKey` está colapsado
   - Nenhuma mudança necessária no `CollapsedGroupPopover` (já itera todos os itens)

Não há necessidade de alterar translations — os labels existentes são suficientes.
