
## Melhoria UX/UI — Navegação do VPS Docs

### Problema
A sidebar esquerda com 192px fixos consome ~20% do espaço horizontal disponível. Com o painel admin já tendo sua própria sidebar, o layout fica com duas colunas de navegação competindo por atenção.

### Proposta: Barra de navegação horizontal (tabs sticky no topo)

Substituir a sidebar lateral por uma barra de pills/tabs horizontal no topo da área de conteúdo, que fica sticky ao fazer scroll. Isso:
- Libera 100% da largura horizontal para o conteúdo
- Mantém a navegação sempre visível durante o scroll
- É o padrão adotado por docs técnicos modernos (Vercel, Linear, Supabase)

```text
┌────────────────────────────────────────────────────────┐
│ Admin Sidebar │   VPS > [Setup] [Docs]                  │
│               ├────────────────────────────────────────┤
│               │ ┌─ sticky nav pills ─────────────────┐ │
│               │ │ [Visão Geral][Arquitetura][Serviços]│ │
│               │ │ [Smart Proxy][Traefik][Novo App]... │ │
│               │ └────────────────────────────────────┘ │
│               │                                        │
│               │  conteúdo com largura total            │
│               │                                        │
└───────────────┴────────────────────────────────────────┘
```

### Detalhes de implementação

**`src/pages/admin/AdminVpsDocsContent.tsx`**

1. Remover `<aside>` (sidebar esquerda de 192px) completamente.
2. Substituir pelo layout de coluna única:
   - Header da página
   - `<nav>` sticky com `position: sticky; top: 0` dentro do scroll container, com `bg-[#0a0c10]/95 backdrop-blur-sm` para não perder contexto ao rolar
   - Pills horizontais com scroll horizontal automático (`overflow-x-auto`) para telas menores — assim não quebra em viewports estreitas
3. Pill ativo: borda inferior colorida + texto branco (estilo tab underline, consistente com as abas Setup/Docs acima)
4. Conteúdo ocupa 100% da largura disponível, com `max-w-3xl` para manter legibilidade

### Estilo dos pills

```
[Visão Geral]  [Arquitetura]  [Serviços]  [Smart Proxy]  [Traefik]  [Novo App]  [Troubleshooting]
───────────────────────────────────────────────────────────────────────────────────────────────────
```

- Fundo transparente, texto `white/40`
- Ativo: `border-b-2 border-white/60 text-white`
- Hover: `text-white/70`
- Separador: linha `border-b border-white/8` abaixo dos pills
- Ícone + label em cada pill (ícone `size={11}` para não sobrecarregar)

### Arquivo editado
- `src/pages/admin/AdminVpsDocsContent.tsx` — substituir estrutura `flex` com aside por coluna única com nav sticky horizontal
