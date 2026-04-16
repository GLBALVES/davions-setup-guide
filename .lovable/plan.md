

## Problema

Quando não há páginas, `homeSections` é setado como `null` (linha 104 do StorePage). No PublicSiteRenderer, a condição `visibleSections !== null` é `false`, então cai no fallback legado que monta os links Sessions/About/Blog/Contact.

## Solução

Duas mudanças simples:

### 1. StorePage.tsx — usar array vazio em vez de null quando não há home
Linha 104: mudar de `homePage ? orderedSections : null` para `orderedSections` (que já será `[]` quando não há home). Isso garante que `visibleSections` sempre seja um array quando o site_pages foi consultado, sinalizando ao renderer que o sistema novo está ativo.

```typescript
// antes
setHomeSections(homePage ? orderedSections : null);

// depois  
setHomeSections(orderedSections); // [] quando não há home — sinaliza sistema ativo
```

### 2. Verificação no PublicSiteRenderer
A condição na linha 779 já funciona corretamente com essa mudança — `visibleSections !== null` será `true` (porque é `[]`), e cairá na branch que retorna `[]` (nav vazio).

Nenhuma outra mudança necessária. O nav ficará completamente vazio quando não houver páginas.

