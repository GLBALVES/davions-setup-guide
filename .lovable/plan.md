
Objetivo: diagnosticar e corrigir o motivo pelo qual um usuário aprovado volta a aparecer como `pending`.

O que encontrei
- O bloqueio de acesso depende exclusivamente de `photographers.approval_status` em `src/components/ProtectedRoute.tsx`.
- A tela de aprovações em `src/pages/admin/AdminApprovals.tsx` tenta fazer:
  - leitura de `photographers`
  - update de `photographers.approval_status`
- Nas migrations visíveis, existe política para:
  - admin ler `photographers`
  - dono atualizar o próprio perfil
- Não encontrei política explícita permitindo que admin faça `UPDATE` em `photographers`.

Hipótese mais forte
- O botão “Approve” pode estar atualizando só o estado local da tela e mostrando toast de sucesso, mas o banco não está persistindo a mudança por causa de RLS/permissão.
- Aí, quando a lista recarrega ou o usuário entra novamente, o valor real continua `pending`.

Plano de correção
1. Verificar o registro real no banco para o e-mail/usuário afetado
- Confirmar `approval_status` atual
- Confirmar se existe registro duplicado ou algum caso de e-mail/ID divergente

2. Corrigir a permissão de backend
- Adicionar política de RLS para permitir que admins atualizem `public.photographers`
- Manter a política atual do dono atualizar o próprio perfil
- Não mexer em `auth.users` nem armazenar papel/role em perfil

3. Endurecer a tela de aprovações
- Em `AdminApprovals.tsx`, validar o retorno do update
- Tratar caso de zero linhas afetadas como falha real
- Recarregar a lista após aprovar/rejeitar para refletir o valor persistido do banco, não apenas o estado local

4. Melhorar diagnóstico visual
- Exibir mensagem de erro mais específica quando a atualização falhar
- Opcionalmente mostrar confirmação visual de que o status foi salvo

5. Validar fluxo completo
- Aprovar um usuário pendente
- Recarregar `/admin/approvals`
- Fazer login com a conta aprovada
- Confirmar que o `ProtectedRoute` não mostra mais `PendingApprovalScreen`

Arquivos envolvidos
- `supabase/migrations/...` — nova policy para admin atualizar `photographers`
- `src/pages/admin/AdminApprovals.tsx` — robustez no update + reload pós-ação
- `src/components/ProtectedRoute.tsx` — provavelmente sem mudança, pois a leitura já está correta

Detalhe técnico
- Hoje a política encontrada para update em `photographers` usa `id = auth.uid()`, ou seja, o próprio usuário altera o próprio perfil.
- Para o fluxo de aprovação funcionar, o admin precisa de uma policy separada de `UPDATE`, algo como permitir update quando `has_role(auth.uid(), 'admin')` for verdadeiro.
- Isso explica perfeitamente o sintoma “aprovei 2 vezes, mas volta para pendente”.

Resultado esperado após implementar
- Aprovação persiste de verdade no banco
- O usuário deixa de cair na tela de pendência
- A lista de aprovações passa a refletir sempre o status real salvo
