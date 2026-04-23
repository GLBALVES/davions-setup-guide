
## Atualizar ícone do badge "Made with Davions"

O badge ainda mostra a versão antiga porque o arquivo `src/assets/davions-badge.png` precisa ser substituído pela nova imagem enviada (`selo_branco-2.png`) e a classe `invert` precisa ser removida — o selo já é desenhado em preto sobre fundo branco circular, então `invert` está descaracterizando ele.

### Mudanças

1. **Substituir o asset** — copiar `user-uploads://selo_branco-2.png` para `src/assets/davions-badge.png` (sobrescrevendo o anterior).

2. **`src/components/store/DavionsFloatingBadge.tsx`** — ajustar o container e a imagem para que o novo selo apareça corretamente:
   - Remover `invert` do `<img>` (o selo já tem o desenho preto sobre fundo branco circular).
   - Remover o fundo escuro do botão (`bg-foreground/90` + `backdrop-blur` + `p-2`) — o selo já é um círculo completo, então o wrapper deve ser transparente, sem padding extra, deixando apenas o selo visível.
   - Aumentar o tamanho da imagem de `h-6 w-6` para `h-10 w-10` para o selo ter presença adequada como badge flutuante.
   - Manter `fixed bottom-4 right-4 z-[60]`, `rounded-full`, sombra suave no hover.

### Resultado esperado

Selo circular branco com o ícone de câmera preto no canto inferior direito de todas as páginas publicadas, substituindo o pill escuro "Made with Davions" anterior.
