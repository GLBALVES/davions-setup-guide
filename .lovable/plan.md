

## Plano: Mostrar quantidade de fotos extras no resumo expandido (popover)

### Problema
No popover de resumo do carrinho (seção "Balance due"), a linha "Extra photos" mostra apenas o valor, sem a quantidade.

### Alteração

**Arquivo:** `src/pages/gallery/GalleryView.tsx`

Na seção "BALANCE DUE" (linha ~1217), alterar a label "Extra photos" para incluir a quantidade:

```
Extra photos → Extra photos (X)
```

Onde X é `inlineSummary.extraPhotos`.

Também na seção do modal de compra (linha ~1929), garantir que a mesma informação esteja consistente.

### Escopo
- 1 arquivo editado: `src/pages/gallery/GalleryView.tsx`
- Duas linhas alteradas (popover + modal, se necessário)

