
## Problema identificado

Os ícones Eye e Share2 existem no código mas ficam invisíveis porque dependem de `bookingUrl`, que por sua vez depende de `storeSlug` (campo `store_slug` na tabela `photographers`). Se o fotógrafo não configurou um `store_slug`, nada aparece.

## Solução

Tornar os ícones **sempre visíveis** no rodapé do card, independente do `store_slug`:

- **Eye** → se tiver `bookingUrl`, abre a preview. Se não tiver, exibe um tooltip informando que o store slug não está configurado (ou navega para as configurações).
- **Share2** → mesmo comportamento.

Além disso, mover os botões para um lugar mais visível e fixo (não só no hover), usando `TooltipProvider` para mostrar mensagem quando o slug não está configurado.

## Arquivos a alterar

- `src/pages/dashboard/Sessions.tsx` — tornar os botões sempre visíveis no rodapé, com estado desabilitado e tooltip quando não houver `store_slug`.

## Implementação

```text
SessionCard footer:
  [price]          [Eye]  [Share2]  Manage →

- Sem store_slug: ícones com opacity-40 + cursor-not-allowed + tooltip "Configure your store URL first"
- Com store_slug: ícones funcionais como hoje
- Remover o overlay duplicado na imagem (simplificar)
```

Mudanças simples em um único arquivo, sem necessidade de alterações no banco.
