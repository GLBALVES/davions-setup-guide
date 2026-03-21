
## Problema

Quando o botão `+` de uma página que **não está selecionada** é clicado, dois bugs ocorrem:

1. **`onAddSection` ignora o `pageId`** — `WebsiteEditor.tsx` linha 513 passa `sections.length` (da home) e descarta o `pageId` recebido.
2. **`handleAddBlock` usa `activePageId`** — ao confirmar no modal, a seção é inserida na página **ativa** atual, não na página cujo `+` foi clicado.

## Solução

### 1. Rastrear o `targetPageId` ao abrir o modal

No `WebsiteEditor.tsx`, ampliar `addBlockState` para guardar o `pageId` alvo:

```ts
const [addBlockState, setAddBlockState] = useState<{
  open: boolean;
  insertAfter: number;
  targetPageId: string | null; // novo
}>({ open: false, insertAfter: 0, targetPageId: null });
```

### 2. Corrigir `onAddSection` no sidebar

```ts
onAddSection={(pageId) => {
  const isHome = pages.find(p => p.id === pageId)?.is_home;
  const count = isHome
    ? sections.length
    : ((pages.find(p => p.id === pageId)?.sections_order as SectionDef[]) ?? []).length;
  setAddBlockState({ open: true, insertAfter: count, targetPageId: pageId });
}}
```

### 3. Corrigir `handleAddBlock` para usar `targetPageId`

Substituir todas as referências a `activePageId` dentro de `handleAddBlock` por `targetPageId` (recebido via parâmetro ou via `addBlockState`). Ao final, definir `activePageId` como a página alvo para o usuário ver o resultado imediatamente.

### 4. Passar `targetPageId` para `AddBlockModal → handleAddBlock`

Ajustar a assinatura de `handleAddBlock` para receber o `targetPageId` e usá-lo, em vez do estado global `activePageId`.

**Arquivos a editar:**
- `src/pages/dashboard/WebsiteEditor.tsx` — único arquivo com todos os changes
