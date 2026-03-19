
## Problema Raiz

A linha `const onCustomDomain = isCustomDomain()` fica **fora do componente React**, no escopo do módulo (linha 74 do App.tsx). Isso significa que é avaliada **uma única vez no carregamento do bundle**, e não reativada quando o browser do fotógrafo carrega a página.

Na prática: o bundle é servido pela CDN da Lovable independente do domínio. Quando `isCustomDomain()` roda no contexto do bundle, `window.location.hostname` pode ser o hostname da Lovable — então `onCustomDomain` fica `false`, e as rotas de custom domain **nunca são registradas no React Router**.

O screenshot confirma: o browser do fotógrafo reconhece `davions.giombelli.com.br` corretamente, mas o app já está renderizando as rotas normais (que retornam 404 / NotFound para `"*"`).

## Solução

Mover `isCustomDomain()` para **dentro do componente `App`**, garantindo que seja avaliado no runtime do browser do cliente, não no módulo estático.

```text
ANTES (errado):
  const onCustomDomain = isCustomDomain();  // módulo escopo — avaliado 1x no bundle
  const App = () => (...)

DEPOIS (correto):
  const App = () => {
    const onCustomDomain = isCustomDomain();  // componente escopo — avaliado no browser do cliente
    return (...)
  }
```

## Mudança Única

**`src/App.tsx`** — mover `const onCustomDomain = isCustomDomain()` de fora do componente para dentro do componente `App`, convertendo a arrow function implícita `() => (...)` para `() => { const onCustomDomain = ...; return (...) }`.

Nenhum outro arquivo precisa ser alterado.
