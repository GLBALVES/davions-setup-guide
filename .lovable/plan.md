
## Problema
`client_projects.session_type` é um campo `text` livre preenchido a partir de uma lista hardcoded em `Projects.tsx` (`SESSION_TYPES = ["Newborn", "Family", ...]`). Não tem nenhuma relação com a tabela `session_types`, que é onde o fotógrafo gerencia seus tipos personalizados.

## Solução
Substituir a lista estática pelo `SessionTypeManager` em modo `select`, que já existe e já lê da tabela `session_types`. Assim o fotógrafo usa seus próprios tipos cadastrados em ambos os lugares.

### Mudança de schema necessária
O campo `session_type text` em `client_projects` guarda o **nome** (string). Precisamos mudar para guardar o **ID** (`uuid`) referenciando `session_types`, para manter consistência. Isso requer:
- Adicionar coluna `session_type_id uuid` em `client_projects`
- Migração dos dados existentes: fazer `UPDATE client_projects SET session_type_id = session_types.id WHERE session_types.name = client_projects.session_type AND session_types.photographer_id = client_projects.photographer_id`
- Manter `session_type text` por compatibilidade (ou removê-lo após migração)

**Alternativa mais simples (sem schema change):** Manter `session_type` como string, mas ao salvar gravar o `name` do tipo selecionado (não o `id`). Isso preserva dados existentes e evita migração.

A alternativa simples é preferível por não quebrar dados existentes e não precisar de migração de risco.

### Arquivos a modificar

**`src/pages/dashboard/Projects.tsx`**

1. Remover `SESSION_TYPES` hardcoded
2. Buscar `sessionTypes` da tabela `session_types` (já feito no `Settings.tsx` e `Personalize.tsx` — reutilizar o mesmo padrão)
3. No `ProjectDialog` (componente interno do form), substituir o `<Select>` estático pelo `<SessionTypeManager mode="select">` — mas como `SessionTypeManager` trabalha com `id`s e o campo salva string, adaptar: ao selecionar, resolver o `name` pelo `id` e salvar o `name` no campo `session_type`
4. Na exibição dos cards (Kanban e List), nenhuma mudança necessária — continua exibindo `project.session_type` (string)

### Fluxo resultante
```text
Fotógrafo cria tipos em Personalize → aparecem no dropdown de Projects
Ao salvar projeto → session_type = nome do tipo selecionado
Exibição nos cards → inalterada
```

### Detalhes técnicos
- No `ProjectDialog`, adicionar state `sessionTypeId` apenas para controle do `SessionTypeManager`
- No `handleSave`, resolver `name` a partir do `sessionTypeId`: `sessionTypes.find(t => t.id === sessionTypeId)?.name || ""`
- Ao carregar projeto existente com string: tentar fazer match por `name` para pré-selecionar o `id` correto no dropdown (`sessionTypes.find(t => t.name === project.session_type)?.id`)
- Adicionar `onRefetch` para recarregar session types após criação de novo tipo inline

Arquivo único: `src/pages/dashboard/Projects.tsx`
