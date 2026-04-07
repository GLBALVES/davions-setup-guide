

## Correção do modal "Save as Session?" estourado

### Problema
O modal de preset está renderizado como um `<Dialog>` separado fora do `<Dialog>` principal, mas sem `z-index` adequado e sem classe de centralização forçada, fazendo com que ele "estoure" visualmente — aparecendo atrás ou desalinhado do overlay.

### Solução
1. **No `DialogContent` do preset dialog** (linha 920), adicionar classes para garantir centralização e z-index elevado: `z-[60]` e `max-w-sm` (já existe).
2. **Adicionar `className="z-[60]"` no `Dialog` overlay** — como o componente `DialogContent` do shadcn/ui já gera um overlay próprio, basta garantir que o `DialogContent` tenha `z-[60]` para ficar acima do primeiro dialog.
3. Alternativamente, usar `AlertDialog` em vez de `Dialog` para o preset, pois `AlertDialog` tem z-index mais alto por padrão e semântica mais adequada para confirmações.

### Alteração
- **Arquivo:** `src/components/dashboard/schedule/CreateBookingDialog.tsx`
- Trocar o segundo `Dialog`/`DialogContent` (linhas 919-949) por `AlertDialog`/`AlertDialogContent` com classes `max-w-sm` e garantir posicionamento correto, ou manter `Dialog` e adicionar `className="z-[60]"` ao `DialogContent`.

