
## Problema diagnosticado

O `SidebarMenuBadge` do shadcn usa `position: absolute` e depende de ser **peer direto** do `SidebarMenuButton` (via seletor CSS `peer/menu-button`). A estrutura atual quebra isso porque:

1. **`ContextMenuTrigger` envolve o `SidebarMenuButton`** — o badge fica fora da hierarquia peer esperada
2. **O badge fica absolutamente posicionado dentro do `SidebarMenuItem`** mas sem levar em conta o `ContextMenu` wrapper — pode sobrepor ou desaparecer
3. **No modo colapsado** o badge está oculto (`group-data-[collapsible=icon]:hidden`) mas os itens com badge aparecem nos popovers sem o badge aparecer visualmente alinhado
4. **No modo expandido**, o badge fica em `right-1` absolutamente posicionado, mas a `ContextMenuTrigger` altera o layout flex do botão fazendo o badge aparecer em posição errada

## Solução

Substituir o `SidebarMenuBadge` absoluto por um **badge inline** renderizado dentro do `NavLink`/botão, como um `<span>` no final do flex. Isso:
- Funciona com o `ContextMenu` wrapper
- É visível no modo expandido alinhado à direita do texto
- Pode ser mostrado como um ponto (dot) no modo colapsado (junto ao ícone)

### Estrutura nova (expanded mode)

```
[icon] [Sessions text .............. ] [badge: 3]
```

O badge inline fica dentro do `NavLink` como último filho flex, alinhado à direita com `ml-auto`.

### Modo colapsado

No modo colapsado o sidebar só mostra ícones via tooltip. Para indicar badge, colocar um **dot indicator** vermelho/escuro no canto superior direito do ícone. Este dot aparece quando `badgeCount > 0` via `position: absolute` no wrapper do ícone.

### Popover (collapsed mode)

Nos popovers já existe código de badge inline correto (linhas 369-373 e 436-440) — esses estão OK e não precisam mudar.

## Mudanças em `DashboardSidebar.tsx`

### 1. `renderRegularItem` — trocar `SidebarMenuBadge` por badge inline

Remover o `SidebarMenuBadge` externo (linha 609-613). Adicionar o badge dentro do `NavLink`, como `<span>` inline com `ml-auto`.

Quando `collapsed`, envolver o ícone num wrapper `relative` e adicionar um dot `absolute top-0 right-0` quando `badgeCount > 0`.

### 2. `SortableFavoriteItem` — mesmo tratamento

Remover o `SidebarMenuBadge` externo (linha 312-316). Adicionar badge inline dentro do `NavLink`.

### 3. Nenhuma mudança em `sidebar.tsx` necessária

As correções são todas em `DashboardSidebar.tsx`.

## Resultado visual esperado

**Expanded:**
```
  Sessions          [3]   ← badge alinhado à direita, dentro do botão
  Bookings          [2]
```

**Collapsed (icon strip):**
```
  [📅]  ← com dot indicator no canto superior direito quando há badge
```

**Popovers (collapsed flyout):**
```
  Sessions ........ [3]  ← já funciona, sem mudança
```

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `src/components/dashboard/DashboardSidebar.tsx` | Remover `SidebarMenuBadge` absoluto; adicionar badge inline dentro do `NavLink` em `renderRegularItem` e `SortableFavoriteItem`; dot indicator no ícone no modo colapsado |
