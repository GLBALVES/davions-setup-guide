

## Ajustar botões da Creative Studio

Os dois botões-card da página Creative Studio estão usando o `Button` com `variant="outline"`, que aplica `uppercase tracking-widest font-light` — estilo pensado para botões de ação, não para cards de navegação. Isso causa texto esmagado e visual desalinhado do padrão card do resto do dashboard.

### Mudanças

**Arquivo: `src/pages/dashboard/creative/CreativeIndexPage.tsx`**

Substituir os `Button variant="outline"` por cards estilizados diretamente (usando classes de `border`, `rounded-lg`, `hover`) que se comportam melhor como cards de navegação:

- Trocar `Button` por `div` estilizado dentro do `Link`, com `border rounded-lg p-6 hover:bg-muted transition-colors cursor-pointer`
- Manter ícone, título e descrição com tipografia normal (sem uppercase/tracking-widest forçado pelo Button)
- Aumentar levemente a altura para `h-28` e dar mais padding
- Manter grid `grid-cols-1 sm:grid-cols-2` para responsividade
- Garantir que no mobile (< 640px) os cards fiquem empilhados e com largura total

Resultado: cards limpos, alinhados ao design system luxury-minimal, sem o estilo de botão de ação.

