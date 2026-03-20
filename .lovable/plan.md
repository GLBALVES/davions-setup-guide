
## Plano: Implementar toggles de navegacao + menu no site publico

### Problema atual
Os 5 toggles de navegacao (Store, Booking, About, Blog, Contact) configurados no dashboard nao tem efeito no site publico. Apenas `show_about` funciona parcialmente. Nao existe barra de navegacao no site.

### O que sera implementado

**1. Barra de navegacao no topo do site publico**
- Fixa/sticky sobre o hero, com fundo transparente que ganha background ao scrollar
- Exibe logo (se configurado) a esquerda e links das secoes ativas a direita
- Links condicionais baseados nos toggles: Store, About, Blog, Contact
- Menu hamburger no mobile

**2. Toggles controlam visibilidade das secoes**
- `show_store = false` → oculta grid de Sessions
- `show_about = false` → oculta secao About (ja funciona)
- `show_booking = false` → oculta CTA de booking no hero
- `show_blog = false` → oculta link Blog no menu (a secao de blog no site publico sera uma pagina separada futuramente)
- `show_contact = false` → oculta secao de social links/contato no footer

**3. Fetch atualizado**
- Adicionar `show_booking`, `show_blog`, `show_contact` ao select de `photographer_site`
- Adicionar esses campos a interface `SiteConfig`

### Estrutura da nav bar

```text
Desktop:
┌──────────────────────────────────────────────┐
│ [Logo]         Store · About · Blog · Contact│
└──────────────────────────────────────────────┘

Mobile:
┌──────────────────────────────────────────────┐
│ [Logo]                              [☰ Menu] │
│                    ┌─────────────┐           │
│                    │ Store       │           │
│                    │ About       │           │
│                    │ Blog        │           │
│                    │ Contact     │           │
│                    └─────────────┘           │
└──────────────────────────────────────────────┘
```

### Arquivos a alterar
1. **`src/pages/store/StorePage.tsx`** — adicionar nav bar, fetch dos novos campos, condicionar secoes pelos toggles
2. **`src/pages/store/CustomDomainStore.tsx`** — mesmas alteracoes
