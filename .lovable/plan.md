

## Bug: Carrossel não salva no histórico

### Causa raiz

A função `handleApprove` em `CarrosselPage.tsx` (linha 96-102) tenta inserir as colunas `tom` e `nicho` na tabela `carousel_historico`, mas essas colunas **não existem** na tabela. O insert falha silenciosamente porque o `catch` apenas faz `console.error` sem mostrar erro ao usuário.

Colunas existentes: `id`, `photographer_id`, `tema`, `slides_json`, `created_at`
Colunas sendo inseridas que não existem: `tom`, `nicho`

### Correção

**1. Migração de banco de dados** — Adicionar as colunas `tom` e `nicho` à tabela `carousel_historico`:
```sql
ALTER TABLE public.carousel_historico
  ADD COLUMN tom text DEFAULT '',
  ADD COLUMN nicho text DEFAULT '';
```

**2. Corrigir error handling em `CarrosselPage.tsx`** — Mostrar o erro ao usuário em vez de engolir silenciosamente:
- Na linha 96, capturar o retorno `{ error }` do insert
- Se `error`, mostrar `toast.error` com a mensagem
- Só mostrar `toast.success` e fechar edição se o insert tiver sucesso

### Arquivos

| Ação | Arquivo |
|------|---------|
| Migração | Adicionar colunas `tom` e `nicho` em `carousel_historico` |
| Editar | `src/pages/dashboard/creative/CarrosselPage.tsx` — error handling no `handleApprove` |

