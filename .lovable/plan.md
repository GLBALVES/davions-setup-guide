

## Adicionar botão de deletar no histórico de carrosseis

### Problema
O histórico de carrosseis só tem o botão "Carregar". O usuário quer poder deletar itens do histórico.

### Solução

**Editar `src/components/creative/carrossel/CarrosselHistorico.tsx`:**
- Importar `Trash2` do lucide-react e `AlertDialog` do shadcn
- Adicionar estado para controlar o dialog de confirmação de exclusão (`deleteId`)
- Criar função `handleDelete` que faz `supabase.from("carousel_historico").delete().eq("id", id)` e remove o item do estado local
- Adicionar botão com ícone de lixeira ao lado do botão "Carregar" em cada item
- Ao clicar no botão de deletar, abrir AlertDialog de confirmação antes de excluir
- Mostrar `toast.success` ao deletar com sucesso ou `toast.error` se falhar

### RLS
A tabela `carousel_historico` já tem política `ALL` para o photographer autenticado, então o DELETE já é permitido.

### Arquivos

| Ação | Arquivo |
|------|---------|
| Editar | `src/components/creative/carrossel/CarrosselHistorico.tsx` |

Nenhuma migração necessária.

