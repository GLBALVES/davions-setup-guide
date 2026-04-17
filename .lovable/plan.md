
O usuário quer alternativas para o menu lateral do Website Editor no mobile, que atualmente abre como drawer horizontal contendo a faixa de ícones (tabs) + o painel de configurações lado a lado — o que não cabe bem em telas pequenas.

## Opções de layout mobile

### Opção 1 — Drawer vertical com abas no topo (recomendado)
O drawer ocupa a largura quase total da tela (ex: `w-[90vw]` ou `w-full max-w-sm`). Em vez de mostrar a faixa de ícones na lateral esquerda, ela vira uma **barra horizontal de abas no topo** do drawer (Pages, Design, Settings, SEO, etc.), e abaixo aparece o painel de conteúdo da aba selecionada ocupando todo o espaço vertical restante.

```text
┌─────────────────────────┐
│ [📄][🎨][⚙️][🔍][📊] ✕ │  ← tabs horizontais
├─────────────────────────┤
│                         │
│   Painel da aba ativa   │
│   (Pages, Design...)    │
│                         │
└─────────────────────────┘
```

**Prós:** familiar, aproveita largura total, leitura confortável.
**Contras:** se tiver muitas abas, scroll horizontal nos ícones.

### Opção 2 — Bottom Sheet (estilo app nativo)
Drawer sobe de baixo para cima, ocupa ~85% da altura. Ícones de aba ficam fixos no topo do sheet como pills, conteúdo abaixo. Gesto natural em mobile.

**Prós:** ergonômico (polegar alcança), moderno.
**Contras:** cobre o preview enquanto aberto.

### Opção 3 — Duas etapas (lista de seções → painel)
Primeiro o drawer abre uma **lista vertical** das seções (Pages, Design, Settings…). Ao tocar em uma, navega para uma segunda tela dentro do drawer com o painel completo + botão "Voltar".

**Prós:** cada tela respira, zero competição por espaço.
**Contras:** um toque a mais para chegar ao conteúdo.

### Opção 4 — Bottom navigation bar fixa + sheet por aba
Barra fixa no rodapé com os ícones (igual Instagram/apps). Tocar em um ícone abre um bottom sheet apenas com o painel daquela seção.

**Prós:** acesso rápido, padrão mobile reconhecido.
**Contras:** ocupa espaço permanente do preview.

## Minha recomendação
**Opção 1** — é a mudança mais simples sobre a estrutura atual (já existe o `Sheet`), mantém o mesmo modelo mental do desktop (tabs + painel), e resolve o problema de "horizontal apertado" virando as tabs para cima. Reaproveita os componentes `Tabs` do shadcn.

## Pergunta
Qual opção você prefere que eu implemente?
