
## Problema identificado

A refatoração anterior removeu completamente a `<TabsContent value="store">` do `Personalize.tsx`. O estado e os handlers (`handleSaveStore`, `storeSlug`, `customDomain`) ainda existem no código, mas nenhuma aba os renderiza. A tab list também não contém mais `{ value: "store", label: "Store" }`.

## Correção

Reintroduzir a aba **STORE** no `Personalize.tsx` com apenas as duas seções que pertencem a ela:
1. **Store URL** — slug input com preview de link copiável
2. **Custom Domain** — campo de domínio personalizado com link para documentação

### Mudanças em `Personalize.tsx`

1. Adicionar `{ value: "store", label: "Store" }` de volta à `TabsList` (entre "business" e "galleries")
2. Inserir `<TabsContent value="store">` com o JSX dessas duas seções — todo o estado e lógica já existem, só falta o JSX renderizado
3. Referenciar o `handleSaveStore` já existente no botão de salvar

### Arquivo a editar
- `src/pages/dashboard/Personalize.tsx` apenas — nenhuma mudança de banco ou lógica necessária
