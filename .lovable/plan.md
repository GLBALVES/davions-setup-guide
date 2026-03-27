

## Plano: Slider com swipe + preenchimento lateral masonry

### Comportamento desejado
- Slider com **transição swipe** (translateX), não crossfade
- Foto principal centralizada, altura 100% do container, sem corte
- Laterais preenchidas com **mini-grid masonry** usando outras fotos do portfólio
- Loop infinito mantido

### Mudanças técnicas

**Arquivo: `src/pages/store/SessionDetailPage.tsx`**

1. **Trocar crossfade por swipe horizontal**
   - Slides lado a lado com `translateX` baseado no índice ativo
   - Arrastar move o container com offset em tempo real
   - Ao soltar, anima para o slide mais próximo

2. **Slide de foto individual — layout em 3 colunas**
   - Coluna esquerda: mini masonry grid (2-3 fotos do portfólio) com `object-cover`, preenchendo a lateral
   - Centro: foto principal com `object-contain`, `height: 100%`, largura natural
   - Coluna direita: mini masonry grid (2-3 fotos diferentes) com `object-cover`
   - As fotos laterais são selecionadas do array `slides` excluindo a foto atual
   - Se a foto principal já preenche a tela toda, as laterais ficam ocultas (largura 0)

3. **Cálculo dinâmico da largura lateral**
   - Usar `onLoad` da imagem principal para obter aspect ratio real
   - Calcular: `imgWidth = containerHeight * aspectRatio`
   - Se `imgWidth >= containerWidth`: sem laterais
   - Senão: cada lateral = `(containerWidth - imgWidth) / 2`

4. **Slides masonry (já existentes)**: mantidos como estão, ocupando tela cheia

### Resultado visual
```text
┌──────────┬────────────────────┬──────────┐
│ masonry  │                    │ masonry  │
│ grid     │   FOTO PRINCIPAL   │ grid     │
│ (fotos   │   (height 100%)    │ (fotos   │
│  extras) │   (sem corte)      │  extras) │
│          │                    │          │
└──────────┴────────────────────┴──────────┘
           ◄──── swipe ────►
```

