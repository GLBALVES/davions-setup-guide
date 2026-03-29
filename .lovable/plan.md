

## Corrigir labels mostrando "tabs.xxx" em vez do texto traduzido

### Problema
O `useTranslation("email")` busca namespace `"email"`, mas `email-i18n.ts` registra sob `"translation"`. Resultado: chaves brutas aparecem na tela.

### Correção
**Arquivo: `src/i18n/email-i18n.ts`** — Alterar namespace de `translation` para `email` e adicionar `defaultNS`:

```typescript
resources: {
  pt: { email: pt },
  en: { email: en },
  es: { email: es }
},
defaultNS: 'email',
lng: 'pt',
```

Uma única alteração, resolve todos os textos do módulo.

