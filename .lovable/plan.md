
O erro foi de lugar mesmo: hoje o refresh já existe no `AdminLayout`, mas a tela `/admin/email` também tem um header próprio dentro de `AdminEmailManager`, e é esse header que o usuário enxerga como barra principal do módulo.

Plano direto:
1. Remover a dependência visual do refresh no `AdminLayout` para esse caso e colocar o botão no header interno de `src/components/admin/AdminEmailManager.tsx`
2. Posicionar o ícone de refresh no grupo de ações do topo, ao lado do sino, antes dos outros ícones
3. Fazer o clique executar `window.location.reload()`
4. Envolver com `Tooltip` e manter o mesmo padrão visual dos outros botões (`variant="outline" size="icon" className="h-8 w-8"`)
5. Garantir que continue funcionando nos 3 idiomas sem quebrar layout do módulo

Arquivos:
- `src/components/admin/AdminEmailManager.tsx` — adicionar o botão no lugar certo
- opcional: `src/components/admin/AdminLayout.tsx` — remover o refresh global se estiver redundante e duplicando a ação em outras telas admin

Resultado esperado:
```text
/admin/email
topo do módulo de email
[sino] [refresh] [idioma] [config] [compor]
```

Detalhe técnico:
- O header visível do módulo está em `AdminEmailManager.tsx` nas linhas do bloco:
  - sino (`Bell`) já existe
  - depois dele entram idioma, config e compose
- O botão certo deve entrar exatamente nesse bloco, não no `DashboardHeader` e não só no layout externo admin
