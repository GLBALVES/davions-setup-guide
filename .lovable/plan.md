

## Ajustar modal "Salvar Carrossel" — botões saindo do modal

### Problema
Os botões de seleção de modelo e os botões "Cancelar"/"Salvar" estão transbordando para fora do modal porque o `DialogContent` não tem `overflow-hidden` e os botões com `flex-1` podem expandir além do container em telas menores.

### Solução

**Editar `src/pages/dashboard/creative/CarrosselPage.tsx`** (linhas 260-281):
- Adicionar `overflow-hidden` ao `DialogContent`
- Trocar o layout dos botões de modelo para `flex-wrap` e remover `flex-1`, usando `min-w-[100px]` para manter consistência
- Garantir que `DialogFooter` fique dentro do modal com espaçamento correto

### Arquivo

| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/dashboard/creative/CarrosselPage.tsx` — classes do dialog de aprovação |

