
## Ordenação manual de sessões por drag-and-drop

### O que muda

**Banco de dados**: adicionar coluna `sort_order integer default 0` na tabela `sessions`.

**`src/pages/dashboard/Sessions.tsx`**:
1. Adicionar opção `"manual"` ao tipo de sort — quando selecionada, a ordenação usa o campo `sort_order` da sessão
2. Quando sort = `"manual"`, exibir alças de drag (GripVertical) em cada card/linha
3. Usar `@dnd-kit/core` + `@dnd-kit/sortable` (já estão no projeto via PagesTab) para arrastar
4. Ao soltar, recalcular `sort_order` (índice 0, 1, 2…) e fazer `UPDATE` em batch para todas as sessões reordenadas
5. Adicionar opção "Manual" no dropdown de ordenação

**Interface**:
- No modo grid: ícone de grip no canto superior esquerdo de cada card, visível sempre que sort = "manual"
- No modo list: coluna de grip à esquerda da linha
- Ao arrastar, card/linha fica semi-transparente (opacity 50%) com visual de "levantado"

### Dados no banco
- Migração: `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;`
- Ao buscar as sessões com sort = "manual", usar `.order("sort_order", { ascending: true })`
- Ao inicializar (sort_order = 0 em todas), setar o índice baseado em `created_at` para não quebrar a ordem existente

### Arquivos

| Arquivo | Ação |
|---|---|
| `supabase/migrations/` | Novo: ADD COLUMN sort_order à tabela sessions + UPDATE inicial |
| `src/pages/dashboard/Sessions.tsx` | DnD context, alças, handler de reordenação, opção "Manual" no sort |

### Fluxo técnico

```text
Usuário seleciona "Manual" no dropdown de sort
  → sessões são exibidas por sort_order
  → alças GripVertical aparecem em cada card/linha
  → usuário arrasta sessão para nova posição
  → onDragEnd: arrayMove → recalcular sort_order (index) → UPDATE no banco em paralelo
  → estado local atualizado imediatamente (optimistic update)
```

A coluna `sort_order` também será respeitada na StorePage pública quando sort = "manual", garantindo que a vitrine do fotógrafo reflita a mesma ordem — basta adicionar `.order("sort_order")` na query de sessões ativas.
