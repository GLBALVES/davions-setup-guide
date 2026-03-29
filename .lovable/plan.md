

## Corrigir IDs incompatíveis (text vs uuid) nas tabelas de email

### Problema
Todas as 10 tabelas `email_*` têm `id uuid` no banco, mas o código gera IDs baseados em texto como `c${Date.now()}`, `p${Date.now()}`, `sig${Date.now()}`. Isso causa erro 400: `"invalid input syntax for type uuid"`. A conta é salva no state local mas falha no banco, e por isso a tela de configuração não aparece corretamente.

### Solução
Substituir todas as gerações de ID por `crypto.randomUUID()` em dois arquivos:

**1. `src/components/admin/AdminEmailManager.tsx`**
- Linha 771: `c${Date.now()}` → `crypto.randomUUID()`  (contas)
- Linha 729: `p${Date.now()}` → `crypto.randomUUID()`  (pastas)
- Linha 799: `sig${Date.now()}` → `crypto.randomUUID()` (assinaturas)
- Qualquer outro ponto onde IDs de templates, grupos, regras ou campanhas sejam gerados com prefixo + timestamp

**2. `src/hooks/use-admin-email-data.ts`**
- Verificar que `persistPreferencias` usa `userId` (que é uuid) como `id` — OK
- Verificar que `persistContaUpsert` não inclui `user_id` no payload — precisa adicionar `user_id` nos inserts/upserts de todas as tabelas que possuem essa coluna

### Detalhes técnicos
- `crypto.randomUUID()` é suportado nativamente em navegadores modernos e gera UUIDs v4 válidos
- Os upserts no hook precisam incluir `user_id` no payload para que as políticas RLS de INSERT funcionem (a coluna `user_id` tem default `auth.uid()`, mas o PostgREST pode não aplicar defaults se o campo não é enviado)

