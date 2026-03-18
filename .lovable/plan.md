
## Custom Domain — Página de Erro Personalizada

### O que mudar

**Arquivo: `src/pages/store/CustomDomainStore.tsx`**

Substituir o bloco `if (notFound)` atual (linhas 80–86) por uma página de erro elegante e branded.

### Design da página de erro

- Fundo escuro/neutro (ex: `bg-[#0a0a0a]`) para contraste editorial
- Logo Davions (`src/assets/logo_principal_preto.png`) — com filtro `invert` para ficar branca no fundo escuro
- Ícone de câmera decorativo com opacidade baixa
- Mensagem principal: `"Este domínio não está configurado"` ou similar
- Subtexto: explicação amigável — o fotógrafo ainda não concluiu a configuração
- Linha divisória e rodapé `"Powered by Davions"` consistente com o resto do store

### Estrutura visual

```text
┌──────────────────────────────────────┐
│                                      │
│   [logo DAVIONS — branco]            │
│                                      │
│          ·  [ícone câmera]  ·        │
│                                      │
│   Este domínio não está configurado  │
│   (subtexto explicativo)             │
│                                      │
│   ─────────────────────────────      │
│          Powered by Davions          │
└──────────────────────────────────────┘
```

### Scope
- 1 arquivo: `src/pages/store/CustomDomainStore.tsx`
- Nenhuma mudança de banco, edge function ou rota necessária
